import json

# These are keyword→sentence pairs
# Keywords: what the patient types (2-3 words max)
# Sentence: what should be spoken out loud
# Focus on hospital/care setting scenarios
# expanding dataset: 
# 1. retrain: python trainn.py
# 2. uvicorn server:app --reload

dataset = [
    # ── Pain & Discomfort ──
    {"keywords": "PAIN", "sentence": "I am in pain, please help me."},
    {"keywords": "PAIN LEG", "sentence": "I am having pain in my leg, could someone please check on me."},
    {"keywords": "PAIN ARM", "sentence": "My arm is hurting, I need some help please."},
    {"keywords": "PAIN BACK", "sentence": "My back is in pain, could you help me adjust my position."},
    {"keywords": "PAIN CHEST", "sentence": "I am having chest pain, please come quickly."},
    {"keywords": "PAIN HEAD", "sentence": "I have a headache, could I please have some medication."},
    {"keywords": "PAIN STOMACH", "sentence": "My stomach is hurting, I need assistance please."},
    {"keywords": "HURT BAD", "sentence": "I am hurting badly, I need pain medication please."},
    {"keywords": "MEDICINE PAIN", "sentence": "I think I need my pain medication, could you bring it please."},
    {"keywords": "MEDICINE NOW", "sentence": "I need my medication now please, it is urgent."},

    # ── Temperature ──
    {"keywords": "HOT", "sentence": "I am feeling too hot, could you help me cool down."},
    {"keywords": "COLD", "sentence": "I am feeling cold, could I please have a blanket."},
    {"keywords": "BED HOT", "sentence": "I am feeling too hot in bed, could you adjust my blanket or the room temperature."},
    {"keywords": "BED COLD", "sentence": "I am cold in bed, could I please have an extra blanket."},
    {"keywords": "BLANKET PLEASE", "sentence": "Could I please have a blanket, I am feeling cold."},
    {"keywords": "BLANKET OFF", "sentence": "Could you remove the blanket please, I am too warm."},
    {"keywords": "WINDOW OPEN", "sentence": "Could you open the window please, I need some fresh air."},
    {"keywords": "WINDOW CLOSE", "sentence": "Could you close the window please, I am feeling cold."},
    {"keywords": "FAN ON", "sentence": "Could you turn the fan on please, I am feeling hot."},
    {"keywords": "FAN OFF", "sentence": "Could you turn the fan off please, I am cold."},

    # ── Basic Needs ──
    {"keywords": "WATER", "sentence": "Could I please have some water, I am thirsty."},
    {"keywords": "WATER PLEASE", "sentence": "I am very thirsty, could I please have some water."},
    {"keywords": "FOOD", "sentence": "I am hungry, could I please have something to eat."},
    {"keywords": "FOOD PLEASE", "sentence": "Could I please have some food, I am feeling hungry."},
    {"keywords": "BATHROOM", "sentence": "I need to use the bathroom, could someone help me please."},
    {"keywords": "BATHROOM URGENT", "sentence": "I urgently need to use the bathroom, please help me right away."},
    {"keywords": "HUNGRY", "sentence": "I am feeling hungry, could I please have something to eat."},
    {"keywords": "THIRSTY", "sentence": "I am very thirsty, could I please have some water or juice."},

    # ── Positioning & Comfort ──
    {"keywords": "TURN BODY", "sentence": "Could you help me change my position please, I am uncomfortable."},
    {"keywords": "SIT UP", "sentence": "Could you help me sit up please, I would like to change my position."},
    {"keywords": "LIE DOWN", "sentence": "Could you help me lie down please, I am tired."},
    {"keywords": "PILLOW", "sentence": "Could you adjust my pillow please, I am not comfortable."},
    {"keywords": "PILLOW UP", "sentence": "Could you prop my pillow up a bit more please."},
    {"keywords": "UNCOMFORTABLE", "sentence": "I am feeling uncomfortable, could you help me adjust my position."},
    {"keywords": "BED UP", "sentence": "Could you raise the head of my bed a little please."},
    {"keywords": "BED DOWN", "sentence": "Could you lower my bed a little please."},

    # ── Communication with Staff ──
    {"keywords": "NURSE", "sentence": "Could a nurse please come and see me."},
    {"keywords": "NURSE HELP", "sentence": "Nurse, I need your help please, could you come."},
    {"keywords": "NURSE SORRY", "sentence": "I am sorry to bother you nurse, but I need some assistance."},
    {"keywords": "DOCTOR", "sentence": "I would like to speak with a doctor please."},
    {"keywords": "DOCTOR PLEASE", "sentence": "Could you please call the doctor, I need to speak with them."},
    {"keywords": "HELP", "sentence": "I need help please, could someone come."},
    {"keywords": "HELP NOW", "sentence": "I need help right now, please come quickly."},
    {"keywords": "URGENT", "sentence": "This is urgent, I need assistance immediately please."},
    {"keywords": "EMERGENCY", "sentence": "I need emergency help right now, please call someone immediately."},

    # ── Family & Visitors ──
    {"keywords": "FAMILY", "sentence": "I would like to see my family, could you contact them please."},
    {"keywords": "FAMILY CALL", "sentence": "Could you please call my family for me, I would like to speak with them."},
    {"keywords": "FAMILY COME", "sentence": "Could you ask my family to come visit me please."},
    {"keywords": "PHONE", "sentence": "Could I please use the phone to call someone."},
    {"keywords": "PHONE FAMILY", "sentence": "Could you help me call my family on the phone please."},
    {"keywords": "VISITOR", "sentence": "I am expecting a visitor, could you let them in please."},

    # ── Emotions & Wellbeing ──
    {"keywords": "SCARED", "sentence": "I am feeling scared and anxious, could someone stay with me please."},
    {"keywords": "SCARED ALONE", "sentence": "I am scared and do not want to be alone, could someone please stay."},
    {"keywords": "SAD", "sentence": "I am feeling sad right now, could someone please come talk to me."},
    {"keywords": "LONELY", "sentence": "I am feeling lonely, could someone please come sit with me for a while."},
    {"keywords": "WORRIED", "sentence": "I am feeling worried, could someone explain what is happening please."},
    {"keywords": "ANXIOUS", "sentence": "I am feeling very anxious right now, I could use some reassurance."},
    {"keywords": "HAPPY", "sentence": "I am feeling happy today, thank you for taking such good care of me."},
    {"keywords": "TIRED", "sentence": "I am feeling very tired, I would like to rest now please."},
    {"keywords": "SLEEP", "sentence": "I am very tired and would like to sleep, could you help me get comfortable."},
    {"keywords": "BORED", "sentence": "I am feeling bored, could someone bring me something to do please."},

    # ── Medical ──
    {"keywords": "DIZZY", "sentence": "I am feeling dizzy, could someone please check on me."},
    {"keywords": "NAUSEA", "sentence": "I am feeling nauseous, I think I might be sick."},
    {"keywords": "SICK", "sentence": "I am not feeling well, I think I need medical attention."},
    {"keywords": "BREATHE HARD", "sentence": "I am having difficulty breathing, please come help me right away."},
    {"keywords": "DIZZY BAD", "sentence": "I am very dizzy, I need someone to come check on me immediately."},
    {"keywords": "HEART FAST", "sentence": "My heart is beating very fast, I need someone to check on me please."},
    {"keywords": "SWALLOW HARD", "sentence": "I am having trouble swallowing, could someone come help me please."},
    {"keywords": "BLEED", "sentence": "I think I am bleeding, please come and check on me right away."},

    # ── Equipment ──
    {"keywords": "TV ON", "sentence": "Could you please turn the television on for me."},
    {"keywords": "TV OFF", "sentence": "Could you please turn the television off, I would like some quiet."},
    {"keywords": "LIGHT ON", "sentence": "Could you please turn the light on, it is too dark in here."},
    {"keywords": "LIGHT OFF", "sentence": "Could you please turn the light off, I would like to rest."},
    {"keywords": "LOUD", "sentence": "It is too loud in here, could you please help reduce the noise."},
    {"keywords": "QUIET PLEASE", "sentence": "Could we have some quiet please, I am trying to rest."},
    {"keywords": "MUSIC PLEASE", "sentence": "Could you play some soft music for me please."},

    # ── Positive Responses ──
    {"keywords": "THANK YOU", "sentence": "Thank you so much for your help, I really appreciate everything you do."},
    {"keywords": "THANK NURSE", "sentence": "Thank you nurse, you have been so kind and helpful."},
    {"keywords": "GOOD", "sentence": "I am feeling good today, thank you for asking."},
    {"keywords": "BETTER", "sentence": "I am feeling a little better today, thank you for the care."},
    {"keywords": "YES", "sentence": "Yes, that is correct, thank you for understanding."},
    {"keywords": "NO", "sentence": "No thank you, I am alright for now."},
    {"keywords": "OK", "sentence": "That is okay, I understand, thank you."},
    {"keywords": "SORRY", "sentence": "I am sorry for the trouble, I appreciate your patience with me."},
    {"keywords": "SORRY NURSE", "sentence": "I am sorry to bother you nurse, I know you are very busy."},
    {"keywords": "PLEASE HELP", "sentence": "Could you please help me, I would be very grateful."},
]

# Save to JSON
with open("dataset.json", "w") as f:
    json.dump(dataset, f, indent=2)

print(f"Dataset created: {len(dataset)} examples")

# Show some stats
keywords_lengths = [len(d["keywords"].split()) for d in dataset]
print(f"Avg keyword length: {sum(keywords_lengths)/len(keywords_lengths):.1f} words")
print(f"Min: {min(keywords_lengths)}, Max: {max(keywords_lengths)}")