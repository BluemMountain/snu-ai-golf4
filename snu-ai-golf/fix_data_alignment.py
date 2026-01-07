# -*- coding: utf-8 -*-
import csv
import io

# Data from Step 844 (The exact content user saved)
raw_content = """, ,Name,강순대,곽노준,권민오,김기록,김대욱,김태일,남서우,문성욱,박상길,박철호,박청산,박희석,송원득,신소우,심민선,안삼근,안원익,이교구,이대식,이문형,이상열,이석환,이용환,정대규,정민호,정지환,조중규,현성호,박지선,신수희,김윤석,이진우,장병탁,이성원,전은미,최정훈,김종세,배태근,권혁찬,한예성,최철호,이재욱,이준기,이주민,김은현,채성희,김도열,이영규
count,Date,CC/HD,92.5,88.7,97.3,87.5,87,89.5,90.6,91,83.2,86.6,89.4,88,87.4,101.5,98.3,100.3,0,93,90,86,98,83.3,106.7,93,94.3,88.3,92.6,82.3,105,96.7,0,111,90,78.3,94.5,77.7,88,85.5,101,0,87,101,93,94.7,98.5,100,87,97
1,250427,알펜시아,99,93,97,90,93,96,94,91,86,88,85,92,94,101,103,106,0,90,96,86,98,85,112,99,100,91,92,53,,,,,,,,,,,,,,,,,,,,
2,250625,힐드로사이,,91,,,89,,,,75,,86,,,,94,,,,,,,,,98,96,,,72,,,,,,70,79,,,,,,,,,,,,,
3,250705,설해원(총무단),,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
4,250706,설해원(총무단),,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
5,250725,그랜드챔피언 골프클럽,비로 인해 워크샾 취소됨,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
6,250726,남아소 CC,비로 인해 워크샾 취소됨,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
7,250726,88CC,,,103,85,85,83,85,,81,80,80,,,,,90,,,86,,,84,,89,89,,,83,,92,,,90,,92,75,88,86,,,,,,,,,,
8,250827,힐드로사이,,,,,87,,94,,,85,91,,,105,98,105,,,94,,,,,102,99,,102,,,,,,,,104,,,,,,,,,,,,,
9,250910,사우스스프링스,,82,,,82,,92,,85,87,92,,82,,99,,,,,82,,81,104,92,90,86,91,88,,99,,,,77,100,78,,,101,,87,,,,,,,
10,250924,힐드로사이,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
11,251019,대호단양,86,,92,,85,,,,89,,91,81,84,,,100,,96,84,88,,,,85,,88,87,90,,,,,,88,,80,,85,,,,101,93,89,93,,,
12,251022,힐드로사이,,,,,89,,88,,,,96,,90,101,94,,,,,88,,,104,88,91,,,94,105,99,,111,,,96,,,,,,,,,97,,100,,
13,251126,힐드로사이,,,,,86,,,,,93,94,91,87,99,102,,,,,,,,,91,95,,91,96,,,,,,,96,,,,,,,,,98,104,,87,97"""

f = io.StringIO(raw_content.strip())
reader = list(csv.reader(f))

# Define initial columns
metadata_cols = 3  # "", "", Name  OR  count, Date, CC/HD
names = reader[0][metadata_cols:]

# Create a map for each member: {name: [score1, score2, ...]}
member_map = {}
for i, name in enumerate(names):
    col_idx = i + metadata_cols
    # Collect scores (rows 2 onwards)
    scores = []
    for row_idx in range(2, len(reader)):
        scores.append(reader[row_idx][col_idx])
    member_map[name.strip()] = scores

# Sort names alphabetically
sorted_names = sorted(member_map.keys())

# Create new rows
new_names_row = [reader[0][0], reader[0][1], reader[0][2]] + sorted_names
new_h_row = [reader[1][0], reader[1][1], reader[1][2]]

# Placeholder for handicaps
for name in sorted_names:
    new_h_row.append("0.0")

new_rows = [new_names_row, new_h_row]

# Metadata columns for each round row
round_meta = []
for row_idx in range(2, len(reader)):
    round_meta.append(reader[row_idx][:metadata_cols])

for i, meta in enumerate(round_meta):
    new_row = list(meta)
    for name in sorted_names:
        new_row.append(member_map[name][i])
    new_rows.append(new_row)

# Recalculate Handicaps (Row 1)
for col_idx in range(metadata_cols, len(new_rows[0])):
    scores_found = []
    for row_idx in range(2, len(new_rows)):
        val = new_rows[row_idx][col_idx]
        try:
            f_val = float(val)
            if f_val > 0:
                scores_found.append(f_val)
        except ValueError:
            continue
    if scores_found:
        avg = sum(scores_found) / len(scores_found)
        new_rows[1][col_idx] = f"{avg:.1f}"
    else:
        new_rows[1][col_idx] = "0.0"

# Target file paths
script_js_path = 'c:/Users/pcs10/test antigravity/snu-ai-golf/script.js'
scores_csv_path = 'c:/Users/pcs10/test antigravity/snu-ai-golf/scores.csv'

# Generate CSV string for JS
output = io.StringIO()
writer = csv.writer(output)
writer.writerows(new_rows)
final_csv_str = output.getvalue().strip()

# Update script.js
with open(script_js_path, 'r', encoding='utf-8') as f:
    js_content = f.read()

import re
# Replace CSV_DATA_STRING content
pattern = r'const CSV_DATA_STRING = `.*?`;'
# We need to escape backticks etc if any, but CSV usually don't have them
replacement = f'const CSV_DATA_STRING = `\n{final_csv_str}\n`;'
new_js_content = re.sub(pattern, replacement, js_content, flags=re.DOTALL)

with open(script_js_path, 'w', encoding='utf-8') as f:
    f.write(new_js_content)

# Update scores.csv (EUC-KR for user's Excel)
with open(scores_csv_path, 'w', encoding='euc-kr', errors='replace', newline='') as f:
    writer = csv.writer(f)
    writer.writerows(new_rows)

print("SUCCESS: Sorted and recalculated scores applied to script.js and scores.csv")
