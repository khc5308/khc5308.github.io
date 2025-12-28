import json
import re
import os
from googleapiclient.discovery import build

def parse_duration(duration):
    hours = re.search(r'(\d+)H', duration)
    minutes = re.search(r'(\d+)M', duration)
    seconds = re.search(r'(\d+)S', duration)
    h = int(hours.group(1)) if hours else 0
    m = int(minutes.group(1)) if minutes else 0
    s = int(seconds.group(1)) if seconds else 0
    return f"{(h * 60) + m}:{s:02d}"

def extract_hashtags(text):
    if not text: return []
    return [tag.strip() for tag in re.findall(r'#[\w\.\s]+(?=\n|$|#)', text)]

def update_youtube_playlist(playlist_url, filename="./data/nmixx_new.json"):
    api_key = os.getenv("YOUTUBE_API_KEY")
    youtube = build("youtube", "v3", developerKey=api_key)
    
    playlist_id = re.search(r"list=([^&]+)", playlist_url).group(1)

    # 1. 기존 파일 로드 (최신 영상이 가장 위에 있다고 가정)
    existing_data = []
    latest_title = None
    if os.path.exists(filename):
        with open(filename, "r", encoding="utf-8") as f:
            existing_data = json.load(f)
            if existing_data:
                latest_title = existing_data[0].get("title") # 가장 위 객체의 제목 저장

    new_videos = []
    next_page_token = None
    stop_update = False

    print("🔄 업데이트 확인 중...")

    while not stop_update:
        pl_request = youtube.playlistItems().list(
            part="contentDetails,snippet", # 순서 확인을 위해 snippet 포함
            playlistId=playlist_id,
            maxResults=10, # 업데이트 확인용이므로 적게 요청
            pageToken=next_page_token
        )
        pl_response = pl_request.execute()

        video_ids = []
        temp_snippets = {}

        for item in pl_response.get("items", []):
            v_id = item["contentDetails"]["videoId"]
            v_title = item["snippet"]["title"]

            # [중요] 기존 파일의 최상단 객체와 제목이 같으면 중단
            if latest_title and v_title == latest_title:
                print(f"✅ 중복 지점 발견: '{v_title}'. 업데이트를 중단합니다.")
                stop_update = True
                break
            
            video_ids.append(v_id)
            temp_snippets[v_id] = item["snippet"]

        if not video_ids:
            break

        # 상세 정보 가져오기
        v_response = youtube.videos().list(
            part="snippet,contentDetails",
            id=",".join(video_ids)
        ).execute()

        for v_item in v_response.get("items", []):
            vid = v_item["id"]
            snippet = v_item["snippet"]
            content_details = v_item["contentDetails"]
            
            thumbnails = snippet.get("thumbnails", {})
            best_thumb = thumbnails.get("maxres") or thumbnails.get("high") or thumbnails.get("default")
            
            new_videos.append({
                "title": snippet["title"],
                "publish_date": snippet["publishedAt"].split("T")[0],
                "channel_title": snippet["channelTitle"],
                "hashtags": extract_hashtags(snippet.get("description", "")),
                "url": f"https://www.youtube.com/watch?v={vid}",
                "thumbnail_url": best_thumb.get("url") if best_thumb else "",
                "duration": parse_duration(content_details["duration"])
            })

        next_page_token = pl_response.get("nextPageToken")
        if not next_page_token:
            break

    if not new_videos:
        print("새롭게 추가된 영상이 없습니다.")
        return existing_data

    # 2. 새 영상 + 기존 데이터 합치기 (새 영상이 위로)
    final_data = new_videos + existing_data

    # 3. 파일 저장
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(final_data, f, ensure_ascii=False, indent=4)

    print(f"✨ {len(new_videos)}개의 새로운 영상이 추가되었습니다.")
    return final_data

# 실행
url = "https://youtube.com/playlist?list=PLJGupZvqQHAsIBaJvC4LrafCsQub4Qfw1&si=kMzwvX0H5LXVDhMU"
data = update_youtube_playlist(url)