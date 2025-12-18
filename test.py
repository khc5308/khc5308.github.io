import json

with open("./data/hashtag.txt", "r", encoding="UTF-8") as file:
    hashtags = file.readlines()

di = dict()
for hashtag in hashtags:
    di[hashtag.strip()] = 0
# di = 해시태그 : 0


with open("./data/nmixx_new.json", "r", encoding="UTF-8") as file:
    data = json.load(file)

for line in data:
    for i in line["hashtags"]:
        if i in di.keys():
            di[i] += 1

for k, v in di.items():
    if v >= 1:
        print(k)