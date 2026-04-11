# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: skills.spec.ts >> Skill assessments >> updated assessment replaces old one (UPSERT)
- Location: tests/e2e/skills.spec.ts:108:7

# Error details

```
Error: expect(locator).not.toContainText(expected) failed

Locator: locator('#content')
Expected substring: not "5 strict pull-ups"
Received string: "Skills

  
    ★
    Muscle Up
    #1
  
  
    
  Where You Are
  Up to 8 pull-ups now. Started false grip work.

    
  Edit


  
  
    Save
    Cancel
  

    First muscle-up: 6-9 months (weeks 24-36). Confident reps: 9-12 months.
    
  
  
    8-10 strict pull-ups
    Rebuild pulling base after shoulder stabilization
    Week 8
  

  
  
    12-15 strict pull-ups
    Strength prerequisite for explosive pulling
    Week 20
  

  
  
    False grip hang 20+ sec
    Wrist and forearm conditioning for transition
    Week 16
  

  
  
    High pull-ups to sternum
    Explosive pulling height needed for transition
    Week 20
  

  
  
    Negative muscle-up (5 sec descent)
    Eccentric control through the transition
    Week 24
  

  
  
    First muscle-up
    Bar or rings, any style
    Week 30
  

  
  
    3-5 consecutive muscle-ups
    Confident, repeatable reps
    Week 44
  

  


  
    ◆
    Tuck Planche
    #2
  
  
    
  Where You Are
  No planche training history. Shoulder pain limits plank position. Scapular stabilizer weakness identified.

    
  Edit


  
  
    Save
    Cancel
  

    Planche lean: 4-6 months. Frog stand: 3-4 months. Tuck planche (2-3 sec): 9-12 months. Tuck planche (5-10 sec): 12-15 months. Advanced tuck planche: 15-24 months (stretch goal).
    
  
  
    Pain-free plank 60+ sec
    Baseline pressing endurance
    Week 8
  

  
  
    Frog stand hold
    Balance and wrist conditioning
    Week 14
  

  
  
    Planche lean 20+ degrees
    Progressive forward lean tolerance
    Week 20
  

  
  
    Tuck planche 2-3 sec
    First hold with hips level
    Week 36
  

  
  
    Tuck planche 5-10 sec
    Solid, repeatable hold
    Week 48
  

  
  
    Advanced tuck planche 3-5 sec
    Legs partially extended
    Week 60
  

  


  
    ●
    Pistol Squat
    #3
  
  
    
  Where You Are
  Limited depth on pistol squats. Lateral lunge knee pain. Surgically repaired right Achilles limiting dorsiflexion. Tight hips.

    
  Edit


  
  
    Save
    Cancel
  

    Pistol to box (16 inch): 8-12 weeks. Pistol to box (8 inch): 16-20 weeks. Full-depth pistol (both legs): 5-8 months. Right leg may lag 2-4 weeks behind left.
    
  
  
    Full Cossack squat, no support
    Lateral mobility prerequisite
    Week 8
  

  
  
    Pistol to 16-inch box
    Partial-depth single-leg squat
    Week 12
  

  
  
    Pistol to 8-inch box
    Deeper single-leg squat
    Week 20
  

  
  
    Full pistol with counterbalance
    Complete depth, assisted balance
    Week 28
  

  
  
    Full pistol, no counterbalance
    Clean, controlled single-leg squat
    Week 36
  

  
  
    Weighted pistol squat
    Loaded single-leg squat
    Week 44
  

  


  
    ▲
    Handstand
    #4
  
  
    
  Where You Are
  Never achieved a handstand. Shoulder pain during overhead loading. Limited thoracic extension. Core work developing.

    
  Edit


  
  
    Save
    Cancel
  

    Wall handstand 30 sec: 3-4 months. Wall handstand 60 sec with controlled entry: 5-6 months. Freestanding 5-10 sec: 6-9 months. Freestanding 15-30 sec: 9-15 months.
    
  
  
    Overhead wall test pass
    Full shoulder range without compensation
    Week 8
  

  
  
    Wall handstand 30 sec
    Stomach-to-wall hold
    Week 14
  

  
  
    Wall handstand 60 sec
    Extended hold with controlled entry
    Week 22
  

  
  
    Freestanding 5-10 sec
    Brief balance holds
    Week 30
  

  
  
    Freestanding 15-30 sec
    Confident freestanding balance
    Week 44
  

  
Roadmap

Phase 1: Joint Restoration
    Weeks 1-8
    This is the program you're in now. Rebuild shoulder stability, knee resilience, Achilles health, core strength, and thoracic mobility. No skill work yet — your joints aren't ready.
    
✗ Pain-Free Planks
✗ Strict Pull-ups (Phase 1 Gate)
✗ Clean Dips (Phase 1 Gate)
✗ Cossack Squat Full Depth
✗ Single-Leg Balance 30s (Gate)
✗ Wall Dorsiflexion 4+ Inches
✗ Hollow Body Hold 30s (Gate)
✗ Overhead Wall Test (Gate)


  

Phase 2: Strength Prerequisites
    Weeks 9-20 (12 weeks)
    Build the raw strength and positions your skills require. Shoulder strength, straight-arm conditioning, single-leg loading, and wrist preparation. Daily CARs and core work continue as maintenance.
    
Strict Pull-ups (Phase 2 Gate)
Parallel Bar Dips (Phase 2 Gate)
False Grip Hang
Ring Support Hold
Pistol Squat to Box
Wall Handstand Hold
Planche Lean
Scapular Pull-ups


  

Phase 3: Skill Acquisition
    Weeks 21-36 (16 weeks)
    Active skill practice begins. Muscle-up transition training, planche lean progressions, pistol squat depth development, and handstand balance work. This is as much neurological as physical.
    
Muscle-ups (Phase 3 Gate)
Tuck Planche Hold
Full Pistol Squat
Freestanding Handstand
Negative Muscle-up
Tuck Planche (Hips Level)


  

Phase 4: Refinement & Beyond
    Weeks 37-52+ (ongoing)
    Polish skill quality, add reps, and begin harder progressions. Multiple clean muscle-ups, advanced planche variations, loaded pistol squats, freestanding handstand confidence.
    
Consecutive Muscle-ups
Tuck Planche 10s Hold
Freestanding Handstand 15s
Full Pistol Squat (No Counterbalance)
Advanced Tuck Planche


  

Benchmarks


  Wall Dorsiflexion Test
  Left: 4-5 inches. Right (Achilles): will start lower — track improvement, don't compare sides.
  3.5
  Last tested: 0 days ago
  Retest due in 14 days
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  



  Single-Leg Balance (Eyes Closed)
  30 seconds each side. Right ankle will lag — that's expected.
  No results yet
  
  
  
  Log Result
  
    
    
      No side
      Left
      Right
    
    
       Target met
    
    
    Save
  



  Hollow Body Hold Time
  Week 1: 10-15s is normal. Week 8 goal: 30-45s.
  No results yet
  
  
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  



  Overhead Reach (Wall Test)
  Thumbs touch wall with back flat = good t-spine and shoulder mobility. If back arches, that's your t-spine restriction.
  No results yet
  
  
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  



  Deep Squat Assessment
  Hips below parallel, heels down, chest up, no pain. Use a phone to film yourself — you'll miss compensations otherwise.
  No results yet
  
  
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  



  90/90 Hip Test
  Both knees within 3-4 inches of floor, spine upright without hands for support.
  No results yet
  
  
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  



  Cross-Body Shoulder Reach
  Fingers touching or overlapping. Note the difference between sides — your tighter side is the priority.
  No results yet
  
  
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  



  Pain-Free Planks
  45+ seconds with zero shoulder pain.
  No results yet
  
  
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  



  Strict Pull-ups (Phase 1 Gate)
  8-10 strict pull-ups.
  No results yet
  
  
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  



  Clean Dips (Phase 1 Gate)
  15+ clean dips.
  No results yet
  
  
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  



  Cossack Squat Full Depth
  Full depth both sides, no support, no pain.
  No results yet
  
  
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  



  Single-Leg Balance 30s (Gate)
  30 seconds each side, eyes closed.
  No results yet
  
  
  
  Log Result
  
    
    
      No side
      Left
      Right
    
    
       Target met
    
    
    Save
  



  Wall Dorsiflexion 4+ Inches
  4+ inches each side.
  No results yet
  
  
  
  Log Result
  
    
    
      No side
      Left
      Right
    
    
       Target met
    
    
    Save
  



  Hollow Body Hold 30s (Gate)
  30+ seconds, arms overhead.
  No results yet
  
  
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  



  Overhead Wall Test (Gate)
  Thumbs touch wall, back stays flat.
  No results yet
  
  
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  



  Strict Pull-ups (Phase 2 Gate)
  12-15 strict pull-ups.
  No results yet
  
  
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  



  Parallel Bar Dips (Phase 2 Gate)
  15-20 parallel bar dips.
  No results yet
  
  
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  



  False Grip Hang
  20+ seconds.
  No results yet
  
  
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  



  Ring Support Hold
  30-second hold with external rotation.
  No results yet
  
  
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  



  Pistol Squat to Box
  Controlled descent and ascent each leg.
  No results yet
  
  
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  



  Wall Handstand Hold
  45-second hold.
  No results yet
  
  
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  



  Planche Lean
  10-second hold at 20+ degrees.
  No results yet
  
  
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  



  Scapular Pull-ups
  3×8 full range on bar.
  No results yet
  
  
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  



  Muscle-ups (Phase 3 Gate)
  1-3 muscle-ups (bar or rings).
  No results yet
  
  
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  



  Tuck Planche Hold
  5-second hold on floor or parallettes.
  No results yet
  
  
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  



  Full Pistol Squat
  Full-depth each leg, controlled tempo.
  No results yet
  
  
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  



  Freestanding Handstand
  20-second hold OR 45-second wall handstand with controlled entry/exit.
  No results yet
  
  
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  



  Negative Muscle-up
  3-second controlled descent.
  No results yet
  
  
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  



  Tuck Planche (Hips Level)
  Hips level with shoulders, held position.
  No results yet
  
  
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  



  Consecutive Muscle-ups
  3-5 consecutive muscle-ups.
  No results yet
  
  
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  



  Tuck Planche 10s Hold
  10+ seconds.
  No results yet
  
  
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  



  Freestanding Handstand 15s
  15+ seconds.
  No results yet
  
  
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  



  Full Pistol Squat (No Counterbalance)
  Full pistol each leg, no counterbalance.
  No results yet
  
  
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  



  Advanced Tuck Planche
  3-5 seconds (stretch goal).
  No results yet
  
  
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  


"
Timeout: 5000ms

Call log:
  - Expect "not toContainText" with timeout 5000ms
  - waiting for locator('#content')
    9 × locator resolved to <div id="content">…</div>
      - unexpected value "Skills

  
    ★
    Muscle Up
    #1
  
  
    
  Where You Are
  Up to 8 pull-ups now. Started false grip work.

    
  Edit


  
  
    Save
    Cancel
  

    First muscle-up: 6-9 months (weeks 24-36). Confident reps: 9-12 months.
    
  
  
    8-10 strict pull-ups
    Rebuild pulling base after shoulder stabilization
    Week 8
  

  
  
    12-15 strict pull-ups
    Strength prerequisite for explosive pulling
    Week 20
  

  
  
    False grip hang 20+ sec
    Wrist and forearm conditioning for transition
    Week 16
  

  
  
    High pull-ups to sternum
    Explosive pulling height needed for transition
    Week 20
  

  
  
    Negative muscle-up (5 sec descent)
    Eccentric control through the transition
    Week 24
  

  
  
    First muscle-up
    Bar or rings, any style
    Week 30
  

  
  
    3-5 consecutive muscle-ups
    Confident, repeatable reps
    Week 44
  

  


  
    ◆
    Tuck Planche
    #2
  
  
    
  Where You Are
  No planche training history. Shoulder pain limits plank position. Scapular stabilizer weakness identified.

    
  Edit


  
  
    Save
    Cancel
  

    Planche lean: 4-6 months. Frog stand: 3-4 months. Tuck planche (2-3 sec): 9-12 months. Tuck planche (5-10 sec): 12-15 months. Advanced tuck planche: 15-24 months (stretch goal).
    
  
  
    Pain-free plank 60+ sec
    Baseline pressing endurance
    Week 8
  

  
  
    Frog stand hold
    Balance and wrist conditioning
    Week 14
  

  
  
    Planche lean 20+ degrees
    Progressive forward lean tolerance
    Week 20
  

  
  
    Tuck planche 2-3 sec
    First hold with hips level
    Week 36
  

  
  
    Tuck planche 5-10 sec
    Solid, repeatable hold
    Week 48
  

  
  
    Advanced tuck planche 3-5 sec
    Legs partially extended
    Week 60
  

  


  
    ●
    Pistol Squat
    #3
  
  
    
  Where You Are
  Limited depth on pistol squats. Lateral lunge knee pain. Surgically repaired right Achilles limiting dorsiflexion. Tight hips.

    
  Edit


  
  
    Save
    Cancel
  

    Pistol to box (16 inch): 8-12 weeks. Pistol to box (8 inch): 16-20 weeks. Full-depth pistol (both legs): 5-8 months. Right leg may lag 2-4 weeks behind left.
    
  
  
    Full Cossack squat, no support
    Lateral mobility prerequisite
    Week 8
  

  
  
    Pistol to 16-inch box
    Partial-depth single-leg squat
    Week 12
  

  
  
    Pistol to 8-inch box
    Deeper single-leg squat
    Week 20
  

  
  
    Full pistol with counterbalance
    Complete depth, assisted balance
    Week 28
  

  
  
    Full pistol, no counterbalance
    Clean, controlled single-leg squat
    Week 36
  

  
  
    Weighted pistol squat
    Loaded single-leg squat
    Week 44
  

  


  
    ▲
    Handstand
    #4
  
  
    
  Where You Are
  Never achieved a handstand. Shoulder pain during overhead loading. Limited thoracic extension. Core work developing.

    
  Edit


  
  
    Save
    Cancel
  

    Wall handstand 30 sec: 3-4 months. Wall handstand 60 sec with controlled entry: 5-6 months. Freestanding 5-10 sec: 6-9 months. Freestanding 15-30 sec: 9-15 months.
    
  
  
    Overhead wall test pass
    Full shoulder range without compensation
    Week 8
  

  
  
    Wall handstand 30 sec
    Stomach-to-wall hold
    Week 14
  

  
  
    Wall handstand 60 sec
    Extended hold with controlled entry
    Week 22
  

  
  
    Freestanding 5-10 sec
    Brief balance holds
    Week 30
  

  
  
    Freestanding 15-30 sec
    Confident freestanding balance
    Week 44
  

  
Roadmap

Phase 1: Joint Restoration
    Weeks 1-8
    This is the program you're in now. Rebuild shoulder stability, knee resilience, Achilles health, core strength, and thoracic mobility. No skill work yet — your joints aren't ready.
    
✗ Pain-Free Planks
✗ Strict Pull-ups (Phase 1 Gate)
✗ Clean Dips (Phase 1 Gate)
✗ Cossack Squat Full Depth
✗ Single-Leg Balance 30s (Gate)
✗ Wall Dorsiflexion 4+ Inches
✗ Hollow Body Hold 30s (Gate)
✗ Overhead Wall Test (Gate)


  

Phase 2: Strength Prerequisites
    Weeks 9-20 (12 weeks)
    Build the raw strength and positions your skills require. Shoulder strength, straight-arm conditioning, single-leg loading, and wrist preparation. Daily CARs and core work continue as maintenance.
    
Strict Pull-ups (Phase 2 Gate)
Parallel Bar Dips (Phase 2 Gate)
False Grip Hang
Ring Support Hold
Pistol Squat to Box
Wall Handstand Hold
Planche Lean
Scapular Pull-ups


  

Phase 3: Skill Acquisition
    Weeks 21-36 (16 weeks)
    Active skill practice begins. Muscle-up transition training, planche lean progressions, pistol squat depth development, and handstand balance work. This is as much neurological as physical.
    
Muscle-ups (Phase 3 Gate)
Tuck Planche Hold
Full Pistol Squat
Freestanding Handstand
Negative Muscle-up
Tuck Planche (Hips Level)


  

Phase 4: Refinement & Beyond
    Weeks 37-52+ (ongoing)
    Polish skill quality, add reps, and begin harder progressions. Multiple clean muscle-ups, advanced planche variations, loaded pistol squats, freestanding handstand confidence.
    
Consecutive Muscle-ups
Tuck Planche 10s Hold
Freestanding Handstand 15s
Full Pistol Squat (No Counterbalance)
Advanced Tuck Planche


  

Benchmarks


  Wall Dorsiflexion Test
  Left: 4-5 inches. Right (Achilles): will start lower — track improvement, don't compare sides.
  3.5
  Last tested: 0 days ago
  Retest due in 14 days
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  



  Single-Leg Balance (Eyes Closed)
  30 seconds each side. Right ankle will lag — that's expected.
  No results yet
  
  
  
  Log Result
  
    
    
      No side
      Left
      Right
    
    
       Target met
    
    
    Save
  



  Hollow Body Hold Time
  Week 1: 10-15s is normal. Week 8 goal: 30-45s.
  No results yet
  
  
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  



  Overhead Reach (Wall Test)
  Thumbs touch wall with back flat = good t-spine and shoulder mobility. If back arches, that's your t-spine restriction.
  No results yet
  
  
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  



  Deep Squat Assessment
  Hips below parallel, heels down, chest up, no pain. Use a phone to film yourself — you'll miss compensations otherwise.
  No results yet
  
  
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  



  90/90 Hip Test
  Both knees within 3-4 inches of floor, spine upright without hands for support.
  No results yet
  
  
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  



  Cross-Body Shoulder Reach
  Fingers touching or overlapping. Note the difference between sides — your tighter side is the priority.
  No results yet
  
  
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  



  Pain-Free Planks
  45+ seconds with zero shoulder pain.
  No results yet
  
  
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  



  Strict Pull-ups (Phase 1 Gate)
  8-10 strict pull-ups.
  No results yet
  
  
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  



  Clean Dips (Phase 1 Gate)
  15+ clean dips.
  No results yet
  
  
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  



  Cossack Squat Full Depth
  Full depth both sides, no support, no pain.
  No results yet
  
  
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  



  Single-Leg Balance 30s (Gate)
  30 seconds each side, eyes closed.
  No results yet
  
  
  
  Log Result
  
    
    
      No side
      Left
      Right
    
    
       Target met
    
    
    Save
  



  Wall Dorsiflexion 4+ Inches
  4+ inches each side.
  No results yet
  
  
  
  Log Result
  
    
    
      No side
      Left
      Right
    
    
       Target met
    
    
    Save
  



  Hollow Body Hold 30s (Gate)
  30+ seconds, arms overhead.
  No results yet
  
  
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  



  Overhead Wall Test (Gate)
  Thumbs touch wall, back stays flat.
  No results yet
  
  
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  



  Strict Pull-ups (Phase 2 Gate)
  12-15 strict pull-ups.
  No results yet
  
  
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  



  Parallel Bar Dips (Phase 2 Gate)
  15-20 parallel bar dips.
  No results yet
  
  
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  



  False Grip Hang
  20+ seconds.
  No results yet
  
  
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  



  Ring Support Hold
  30-second hold with external rotation.
  No results yet
  
  
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  



  Pistol Squat to Box
  Controlled descent and ascent each leg.
  No results yet
  
  
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  



  Wall Handstand Hold
  45-second hold.
  No results yet
  
  
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  



  Planche Lean
  10-second hold at 20+ degrees.
  No results yet
  
  
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  



  Scapular Pull-ups
  3×8 full range on bar.
  No results yet
  
  
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  



  Muscle-ups (Phase 3 Gate)
  1-3 muscle-ups (bar or rings).
  No results yet
  
  
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  



  Tuck Planche Hold
  5-second hold on floor or parallettes.
  No results yet
  
  
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  



  Full Pistol Squat
  Full-depth each leg, controlled tempo.
  No results yet
  
  
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  



  Freestanding Handstand
  20-second hold OR 45-second wall handstand with controlled entry/exit.
  No results yet
  
  
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  



  Negative Muscle-up
  3-second controlled descent.
  No results yet
  
  
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  



  Tuck Planche (Hips Level)
  Hips level with shoulders, held position.
  No results yet
  
  
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  



  Consecutive Muscle-ups
  3-5 consecutive muscle-ups.
  No results yet
  
  
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  



  Tuck Planche 10s Hold
  10+ seconds.
  No results yet
  
  
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  



  Freestanding Handstand 15s
  15+ seconds.
  No results yet
  
  
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  



  Full Pistol Squat (No Counterbalance)
  Full pistol each leg, no counterbalance.
  No results yet
  
  
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  



  Advanced Tuck Planche
  3-5 seconds (stretch goal).
  No results yet
  
  
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  


"

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - banner [ref=e2]:
    - heading "Progress" [level=1] [ref=e3]
    - paragraph [ref=e4]: Personalized Training Protocol
  - main [ref=e5]:
    - generic [ref=e6]:
      - generic [ref=e7]: Skills
      - generic [ref=e8]:
        - generic [ref=e9] [cursor=pointer]:
          - generic [ref=e10]: ★
          - generic [ref=e11]: Muscle Up
          - generic [ref=e12]: "#1"
        - generic [ref=e13]:
          - generic [ref=e14]:
            - generic [ref=e15]: Where You Are
            - generic [ref=e16]: Up to 8 pull-ups now. Started false grip work.
          - button "Edit" [ref=e18]
          - generic [ref=e19]: "First muscle-up: 6-9 months (weeks 24-36). Confident reps: 9-12 months."
          - list [ref=e20]:
            - listitem [ref=e21]:
              - generic [ref=e23]:
                - generic [ref=e24]: 8-10 strict pull-ups
                - generic [ref=e25]: Rebuild pulling base after shoulder stabilization
                - generic [ref=e26]: Week 8
            - listitem [ref=e27]:
              - generic [ref=e29]:
                - generic [ref=e30]: 12-15 strict pull-ups
                - generic [ref=e31]: Strength prerequisite for explosive pulling
                - generic [ref=e32]: Week 20
            - listitem [ref=e33]:
              - generic [ref=e35]:
                - generic [ref=e36]: False grip hang 20+ sec
                - generic [ref=e37]: Wrist and forearm conditioning for transition
                - generic [ref=e38]: Week 16
            - listitem [ref=e39]:
              - generic [ref=e41]:
                - generic [ref=e42]: High pull-ups to sternum
                - generic [ref=e43]: Explosive pulling height needed for transition
                - generic [ref=e44]: Week 20
            - listitem [ref=e45]:
              - generic [ref=e47]:
                - generic [ref=e48]: Negative muscle-up (5 sec descent)
                - generic [ref=e49]: Eccentric control through the transition
                - generic [ref=e50]: Week 24
            - listitem [ref=e51]:
              - generic [ref=e53]:
                - generic [ref=e54]: First muscle-up
                - generic [ref=e55]: Bar or rings, any style
                - generic [ref=e56]: Week 30
            - listitem [ref=e57]:
              - generic [ref=e59]:
                - generic [ref=e60]: 3-5 consecutive muscle-ups
                - generic [ref=e61]: Confident, repeatable reps
                - generic [ref=e62]: Week 44
      - generic [ref=e64] [cursor=pointer]:
        - generic [ref=e65]: ◆
        - generic [ref=e66]: Tuck Planche
        - generic [ref=e67]: "#2"
      - generic [ref=e69] [cursor=pointer]:
        - generic [ref=e70]: ●
        - generic [ref=e71]: Pistol Squat
        - generic [ref=e72]: "#3"
      - generic [ref=e74] [cursor=pointer]:
        - generic [ref=e75]: ▲
        - generic [ref=e76]: Handstand
        - generic [ref=e77]: "#4"
      - generic [ref=e78]:
        - generic [ref=e79]: Roadmap
        - generic [ref=e80]:
          - generic [ref=e83]:
            - generic [ref=e84]: "Phase 1: Joint Restoration"
            - generic [ref=e85]: Weeks 1-8
            - generic [ref=e86]: This is the program you're in now. Rebuild shoulder stability, knee resilience, Achilles health, core strength, and thoracic mobility. No skill work yet — your joints aren't ready.
            - generic [ref=e87]:
              - generic [ref=e88]: ✗ Pain-Free Planks
              - generic [ref=e89]: ✗ Strict Pull-ups (Phase 1 Gate)
              - generic [ref=e90]: ✗ Clean Dips (Phase 1 Gate)
              - generic [ref=e91]: ✗ Cossack Squat Full Depth
              - generic [ref=e92]: ✗ Single-Leg Balance 30s (Gate)
              - generic [ref=e93]: ✗ Wall Dorsiflexion 4+ Inches
              - generic [ref=e94]: ✗ Hollow Body Hold 30s (Gate)
              - generic [ref=e95]: ✗ Overhead Wall Test (Gate)
          - generic [ref=e98]:
            - generic [ref=e99]: "Phase 2: Strength Prerequisites"
            - generic [ref=e100]: Weeks 9-20 (12 weeks)
            - generic [ref=e101]: Build the raw strength and positions your skills require. Shoulder strength, straight-arm conditioning, single-leg loading, and wrist preparation. Daily CARs and core work continue as maintenance.
            - generic [ref=e102]:
              - generic [ref=e103]: Strict Pull-ups (Phase 2 Gate)
              - generic [ref=e104]: Parallel Bar Dips (Phase 2 Gate)
              - generic [ref=e105]: False Grip Hang
              - generic [ref=e106]: Ring Support Hold
              - generic [ref=e107]: Pistol Squat to Box
              - generic [ref=e108]: Wall Handstand Hold
              - generic [ref=e109]: Planche Lean
              - generic [ref=e110]: Scapular Pull-ups
          - generic [ref=e113]:
            - generic [ref=e114]: "Phase 3: Skill Acquisition"
            - generic [ref=e115]: Weeks 21-36 (16 weeks)
            - generic [ref=e116]: Active skill practice begins. Muscle-up transition training, planche lean progressions, pistol squat depth development, and handstand balance work. This is as much neurological as physical.
            - generic [ref=e117]:
              - generic [ref=e118]: Muscle-ups (Phase 3 Gate)
              - generic [ref=e119]: Tuck Planche Hold
              - generic [ref=e120]: Full Pistol Squat
              - generic [ref=e121]: Freestanding Handstand
              - generic [ref=e122]: Negative Muscle-up
              - generic [ref=e123]: Tuck Planche (Hips Level)
          - generic [ref=e126]:
            - generic [ref=e127]: "Phase 4: Refinement & Beyond"
            - generic [ref=e128]: Weeks 37-52+ (ongoing)
            - generic [ref=e129]: Polish skill quality, add reps, and begin harder progressions. Multiple clean muscle-ups, advanced planche variations, loaded pistol squats, freestanding handstand confidence.
            - generic [ref=e130]:
              - generic [ref=e131]: Consecutive Muscle-ups
              - generic [ref=e132]: Tuck Planche 10s Hold
              - generic [ref=e133]: Freestanding Handstand 15s
              - generic [ref=e134]: Full Pistol Squat (No Counterbalance)
              - generic [ref=e135]: Advanced Tuck Planche
      - generic [ref=e136]: Benchmarks
      - generic [ref=e137]:
        - generic [ref=e138]:
          - generic [ref=e139]: Wall Dorsiflexion Test
          - generic [ref=e140]: "Left: 4-5 inches. Right (Achilles): will start lower — track improvement, don't compare sides."
          - generic [ref=e141]: "3.5"
          - generic [ref=e142]: "Last tested: 0 days ago"
          - generic [ref=e143]: Retest due in 14 days
          - button "Log Result" [ref=e145] [cursor=pointer]
        - generic [ref=e146]:
          - generic [ref=e147]: Single-Leg Balance (Eyes Closed)
          - generic [ref=e148]: 30 seconds each side. Right ankle will lag — that's expected.
          - generic [ref=e149]: No results yet
          - button "Log Result" [ref=e151] [cursor=pointer]
        - generic [ref=e152]:
          - generic [ref=e153]: Hollow Body Hold Time
          - generic [ref=e154]: "Week 1: 10-15s is normal. Week 8 goal: 30-45s."
          - generic [ref=e155]: No results yet
          - button "Log Result" [ref=e157] [cursor=pointer]
        - generic [ref=e158]:
          - generic [ref=e159]: Overhead Reach (Wall Test)
          - generic [ref=e160]: Thumbs touch wall with back flat = good t-spine and shoulder mobility. If back arches, that's your t-spine restriction.
          - generic [ref=e161]: No results yet
          - button "Log Result" [ref=e163] [cursor=pointer]
        - generic [ref=e164]:
          - generic [ref=e165]: Deep Squat Assessment
          - generic [ref=e166]: Hips below parallel, heels down, chest up, no pain. Use a phone to film yourself — you'll miss compensations otherwise.
          - generic [ref=e167]: No results yet
          - button "Log Result" [ref=e169] [cursor=pointer]
        - generic [ref=e170]:
          - generic [ref=e171]: 90/90 Hip Test
          - generic [ref=e172]: Both knees within 3-4 inches of floor, spine upright without hands for support.
          - generic [ref=e173]: No results yet
          - button "Log Result" [ref=e175] [cursor=pointer]
        - generic [ref=e176]:
          - generic [ref=e177]: Cross-Body Shoulder Reach
          - generic [ref=e178]: Fingers touching or overlapping. Note the difference between sides — your tighter side is the priority.
          - generic [ref=e179]: No results yet
          - button "Log Result" [ref=e181] [cursor=pointer]
        - generic [ref=e182]:
          - generic [ref=e183]: Pain-Free Planks
          - generic [ref=e184]: 45+ seconds with zero shoulder pain.
          - generic [ref=e185]: No results yet
          - button "Log Result" [ref=e187] [cursor=pointer]
        - generic [ref=e188]:
          - generic [ref=e189]: Strict Pull-ups (Phase 1 Gate)
          - generic [ref=e190]: 8-10 strict pull-ups.
          - generic [ref=e191]: No results yet
          - button "Log Result" [ref=e193] [cursor=pointer]
        - generic [ref=e194]:
          - generic [ref=e195]: Clean Dips (Phase 1 Gate)
          - generic [ref=e196]: 15+ clean dips.
          - generic [ref=e197]: No results yet
          - button "Log Result" [ref=e199] [cursor=pointer]
        - generic [ref=e200]:
          - generic [ref=e201]: Cossack Squat Full Depth
          - generic [ref=e202]: Full depth both sides, no support, no pain.
          - generic [ref=e203]: No results yet
          - button "Log Result" [ref=e205] [cursor=pointer]
        - generic [ref=e206]:
          - generic [ref=e207]: Single-Leg Balance 30s (Gate)
          - generic [ref=e208]: 30 seconds each side, eyes closed.
          - generic [ref=e209]: No results yet
          - button "Log Result" [ref=e211] [cursor=pointer]
        - generic [ref=e212]:
          - generic [ref=e213]: Wall Dorsiflexion 4+ Inches
          - generic [ref=e214]: 4+ inches each side.
          - generic [ref=e215]: No results yet
          - button "Log Result" [ref=e217] [cursor=pointer]
        - generic [ref=e218]:
          - generic [ref=e219]: Hollow Body Hold 30s (Gate)
          - generic [ref=e220]: 30+ seconds, arms overhead.
          - generic [ref=e221]: No results yet
          - button "Log Result" [ref=e223] [cursor=pointer]
        - generic [ref=e224]:
          - generic [ref=e225]: Overhead Wall Test (Gate)
          - generic [ref=e226]: Thumbs touch wall, back stays flat.
          - generic [ref=e227]: No results yet
          - button "Log Result" [ref=e229] [cursor=pointer]
        - generic [ref=e230]:
          - generic [ref=e231]: Strict Pull-ups (Phase 2 Gate)
          - generic [ref=e232]: 12-15 strict pull-ups.
          - generic [ref=e233]: No results yet
          - button "Log Result" [ref=e235] [cursor=pointer]
        - generic [ref=e236]:
          - generic [ref=e237]: Parallel Bar Dips (Phase 2 Gate)
          - generic [ref=e238]: 15-20 parallel bar dips.
          - generic [ref=e239]: No results yet
          - button "Log Result" [ref=e241] [cursor=pointer]
        - generic [ref=e242]:
          - generic [ref=e243]: False Grip Hang
          - generic [ref=e244]: 20+ seconds.
          - generic [ref=e245]: No results yet
          - button "Log Result" [ref=e247] [cursor=pointer]
        - generic [ref=e248]:
          - generic [ref=e249]: Ring Support Hold
          - generic [ref=e250]: 30-second hold with external rotation.
          - generic [ref=e251]: No results yet
          - button "Log Result" [ref=e253] [cursor=pointer]
        - generic [ref=e254]:
          - generic [ref=e255]: Pistol Squat to Box
          - generic [ref=e256]: Controlled descent and ascent each leg.
          - generic [ref=e257]: No results yet
          - button "Log Result" [ref=e259] [cursor=pointer]
        - generic [ref=e260]:
          - generic [ref=e261]: Wall Handstand Hold
          - generic [ref=e262]: 45-second hold.
          - generic [ref=e263]: No results yet
          - button "Log Result" [ref=e265] [cursor=pointer]
        - generic [ref=e266]:
          - generic [ref=e267]: Planche Lean
          - generic [ref=e268]: 10-second hold at 20+ degrees.
          - generic [ref=e269]: No results yet
          - button "Log Result" [ref=e271] [cursor=pointer]
        - generic [ref=e272]:
          - generic [ref=e273]: Scapular Pull-ups
          - generic [ref=e274]: 3×8 full range on bar.
          - generic [ref=e275]: No results yet
          - button "Log Result" [ref=e277] [cursor=pointer]
        - generic [ref=e278]:
          - generic [ref=e279]: Muscle-ups (Phase 3 Gate)
          - generic [ref=e280]: 1-3 muscle-ups (bar or rings).
          - generic [ref=e281]: No results yet
          - button "Log Result" [ref=e283] [cursor=pointer]
        - generic [ref=e284]:
          - generic [ref=e285]: Tuck Planche Hold
          - generic [ref=e286]: 5-second hold on floor or parallettes.
          - generic [ref=e287]: No results yet
          - button "Log Result" [ref=e289] [cursor=pointer]
        - generic [ref=e290]:
          - generic [ref=e291]: Full Pistol Squat
          - generic [ref=e292]: Full-depth each leg, controlled tempo.
          - generic [ref=e293]: No results yet
          - button "Log Result" [ref=e295] [cursor=pointer]
        - generic [ref=e296]:
          - generic [ref=e297]: Freestanding Handstand
          - generic [ref=e298]: 20-second hold OR 45-second wall handstand with controlled entry/exit.
          - generic [ref=e299]: No results yet
          - button "Log Result" [ref=e301] [cursor=pointer]
        - generic [ref=e302]:
          - generic [ref=e303]: Negative Muscle-up
          - generic [ref=e304]: 3-second controlled descent.
          - generic [ref=e305]: No results yet
          - button "Log Result" [ref=e307] [cursor=pointer]
        - generic [ref=e308]:
          - generic [ref=e309]: Tuck Planche (Hips Level)
          - generic [ref=e310]: Hips level with shoulders, held position.
          - generic [ref=e311]: No results yet
          - button "Log Result" [ref=e313] [cursor=pointer]
        - generic [ref=e314]:
          - generic [ref=e315]: Consecutive Muscle-ups
          - generic [ref=e316]: 3-5 consecutive muscle-ups.
          - generic [ref=e317]: No results yet
          - button "Log Result" [ref=e319] [cursor=pointer]
        - generic [ref=e320]:
          - generic [ref=e321]: Tuck Planche 10s Hold
          - generic [ref=e322]: 10+ seconds.
          - generic [ref=e323]: No results yet
          - button "Log Result" [ref=e325] [cursor=pointer]
        - generic [ref=e326]:
          - generic [ref=e327]: Freestanding Handstand 15s
          - generic [ref=e328]: 15+ seconds.
          - generic [ref=e329]: No results yet
          - button "Log Result" [ref=e331] [cursor=pointer]
        - generic [ref=e332]:
          - generic [ref=e333]: Full Pistol Squat (No Counterbalance)
          - generic [ref=e334]: Full pistol each leg, no counterbalance.
          - generic [ref=e335]: No results yet
          - button "Log Result" [ref=e337] [cursor=pointer]
        - generic [ref=e338]:
          - generic [ref=e339]: Advanced Tuck Planche
          - generic [ref=e340]: 3-5 seconds (stretch goal).
          - generic [ref=e341]: No results yet
          - button "Log Result" [ref=e343] [cursor=pointer]
  - navigation [ref=e344]:
    - link "Today" [ref=e345] [cursor=pointer]:
      - /url: /
      - img [ref=e346]
      - generic [ref=e348]: Today
    - link "Progress" [ref=e349] [cursor=pointer]:
      - /url: /progress
      - img [ref=e350]
      - generic [ref=e352]: Progress
    - link "Program" [ref=e353] [cursor=pointer]:
      - /url: /program
      - img [ref=e354]
      - generic [ref=e357]: Program
```

# Test source

```ts
  34  |         data: assessmentBody("muscle-up", "Can do 5 strict pull-ups. No muscle-up experience."),
  35  |       }
  36  |     );
  37  |     expect(response.status()).toBe(202);
  38  |   });
  39  | 
  40  |   test("POST /api/skill-assessment/nonexistent-xyz returns 404", async ({ page }) => {
  41  |     const response = await page.request.post(
  42  |       `${BASE_URL}/api/skill-assessment/nonexistent-skill-xyz`,
  43  |       {
  44  |         headers: { "Content-Type": "application/json" },
  45  |         data: assessmentBody("nonexistent-skill-xyz", "test"),
  46  |       }
  47  |     );
  48  |     expect(response.status()).toBe(404);
  49  |   });
  50  | 
  51  |   test("missing current_state returns 400", async ({ page }) => {
  52  |     // Send empty signal value
  53  |     const response = await page.request.post(
  54  |       `${BASE_URL}/api/skill-assessment/muscle-up`,
  55  |       {
  56  |         headers: { "Content-Type": "application/json" },
  57  |         data: assessmentBody("muscle-up", ""),
  58  |       }
  59  |     );
  60  |     expect(response.status()).toBe(400);
  61  |   });
  62  | 
  63  |   test("assessment appears on /progress page", async ({ page }) => {
  64  |     // Save a distinctive assessment
  65  |     await page.request.post(
  66  |       `${BASE_URL}/api/skill-assessment/muscle-up`,
  67  |       {
  68  |         headers: { "Content-Type": "application/json" },
  69  |         data: assessmentBody("muscle-up", "Can do 5 strict pull-ups. No muscle-up experience."),
  70  |       }
  71  |     );
  72  | 
  73  |     await page.goto("/progress");
  74  |     await page.waitForLoadState("networkidle");
  75  | 
  76  |     await expect(page.locator("#content")).toContainText("5 strict pull-ups");
  77  |   });
  78  | 
  79  |   test("user assessment overrides program default", async ({ page }) => {
  80  |     // Save assessment for muscle-up
  81  |     await page.request.post(
  82  |       `${BASE_URL}/api/skill-assessment/muscle-up`,
  83  |       {
  84  |         headers: { "Content-Type": "application/json" },
  85  |         data: assessmentBody("muscle-up", "Can do 5 strict pull-ups. No muscle-up experience."),
  86  |       }
  87  |     );
  88  | 
  89  |     await page.goto("/progress");
  90  |     await page.waitForLoadState("networkidle");
  91  | 
  92  |     const content = page.locator("#content");
  93  |     // User assessment should appear
  94  |     await expect(content).toContainText("5 strict pull-ups");
  95  |     // Program default should NOT appear for this skill
  96  |     await expect(content).not.toContainText("previously 7-10 before shoulder");
  97  |   });
  98  | 
  99  |   test("skill cards have assessment edit affordance", async ({ page }) => {
  100 |     await page.goto("/progress");
  101 |     await page.waitForLoadState("networkidle");
  102 | 
  103 |     // There should be a reference to the skill-assessment endpoint somewhere in the page
  104 |     const html = await page.locator("#content").innerHTML();
  105 |     expect(html).toContain("skill-assessment");
  106 |   });
  107 | 
  108 |   test("updated assessment replaces old one (UPSERT)", async ({ page }) => {
  109 |     // First assessment
  110 |     await page.request.post(
  111 |       `${BASE_URL}/api/skill-assessment/muscle-up`,
  112 |       {
  113 |         headers: { "Content-Type": "application/json" },
  114 |         data: assessmentBody("muscle-up", "Can do 5 strict pull-ups. No muscle-up experience."),
  115 |       }
  116 |     );
  117 | 
  118 |     // Update with new text
  119 |     await page.request.post(
  120 |       `${BASE_URL}/api/skill-assessment/muscle-up`,
  121 |       {
  122 |         headers: { "Content-Type": "application/json" },
  123 |         data: assessmentBody("muscle-up", "Up to 8 pull-ups now. Started false grip work."),
  124 |       }
  125 |     );
  126 | 
  127 |     await page.goto("/progress");
  128 |     await page.waitForLoadState("networkidle");
  129 | 
  130 |     const content = page.locator("#content");
  131 |     // New text should be present
  132 |     await expect(content).toContainText("8 pull-ups");
  133 |     // Old text should NOT be present (proves UPSERT, not append)
> 134 |     await expect(content).not.toContainText("5 strict pull-ups");
      |                               ^ Error: expect(locator).not.toContainText(expected) failed
  135 |   });
  136 | });
  137 | 
```