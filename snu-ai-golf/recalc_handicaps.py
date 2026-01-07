import csv

input_file = 'c:/Users/pcs10/test antigravity/snu-ai-golf/scores.csv'
output_file = 'c:/Users/pcs10/test antigravity/snu-ai-golf/scores_updated.csv'

with open(input_file, mode='r', encoding='utf-8-sig') as f:
    reader = list(csv.reader(f))

names = reader[0]
handicaps = reader[1]
data_rows = reader[2:]

new_handicaps = list(handicaps)

for col_idx in range(3, len(names)):
    name = names[col_idx]
    if not name.strip(): continue
    
    scores = []
    for row in data_rows:
        val = row[col_idx]
        try:
            # Check if it's a number (ignore "canceled" text etc)
            f_val = float(val)
            if f_val > 0:
                scores.append(f_val)
        except ValueError:
            continue
            
    if scores:
        avg = sum(scores) / len(scores)
        new_handicaps[col_idx] = f"{avg:.1f}"
    else:
        new_handicaps[col_idx] = "0.0"

reader[1] = new_handicaps

with open(output_file, mode='w', encoding='utf-8-sig', newline='') as f:
    writer = csv.writer(f)
    writer.writerows(reader)

print("Updated handicaps calculated.")
