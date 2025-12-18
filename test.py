# import json

# # 파일 경로 설정
# file_a_path = 'asdf.txt'    # 지울 해시태그가 적힌 파일 (텍스트)
# file_b_path = './data/nmixx_new.json'   # 원본 데이터 파일 (JSON)
# output_path = 'B_filtered.json' # 결과가 저장될 파일

# # 1. 지울 해시태그 목록(A)을 불러와 집합(set)으로 만듭니다.
# # (집합을 쓰면 검색 속도가 빨라집니다)
# with open(file_a_path, 'r', encoding='utf-8') as f:
#     # 줄바꿈 문자 제거(.strip) 후 저장
#     tags_to_remove = set(line.strip() for line in f if line.strip())

# # 2. 원본 데이터(B)를 불러옵니다.
# with open(file_b_path, 'r', encoding='utf-8') as f:
#     data = json.load(f)

# # 3. 데이터를 순회하며 해시태그를 필터링합니다.
# for item in data:
    
#     original_tags = item['hashtags']
#     # "원래 태그 중에(tag), 삭제 목록에 없는(not in) 것만 남김"
#     filtered_tags = [tag for tag in original_tags if tag not in tags_to_remove]
    
#     # 필터링된 리스트로 교체
#     item['hashtags'] = filtered_tags

# # 4. 결과를 새 JSON 파일로 저장합니다.
# with open(output_path, 'w', encoding='utf-8') as f:
#     json.dump(data, f, ensure_ascii=False, indent=4)

# print(f"작업 완료! {len(tags_to_remove)}개의 금지 태그를 제외한 결과가 '{output_path}'에 저장되었습니다.")

import json
from collections import Counter


with open('B_filtered.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

def find_unique_hashtags(video_list):
    # 1. 모든 영상의 해시태그를 하나의 리스트로 합칩니다.
    all_hashtags = set()
    for video in video_list:
        # 'hashtags' 키가 없는 경우를 대비해 get()과 빈 리스트를 사용합니다.
        tags = video.get("hashtags", [])
        all_hashtags.update(tags)
        
    return all_hashtags

# 실행 및 결과 출력
result = find_unique_hashtags(data)

print("=== 해시태그 목록 ===")
for tag in result:
    print(tag)