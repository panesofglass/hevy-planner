# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: benchmarks.spec.ts >> Phase advancement >> phase change persists on /progress page reload
- Location: tests/e2e/benchmarks.spec.ts:233:7

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('#content')
Timeout: 5000ms
Expected pattern: /completed/i
Received string:  "Skills····
    ★
    Muscle Up
    #1···········
  Where You Are
  3-5 pull-ups (previously 7-10 before shoulder issues). No muscle-up experience. Shoulder pain during planks and pressing.······
  Edit········
    Save
    Cancel····
    First muscle-up: 6-9 months (weeks 24-36). Confident reps: 9-12 months.···········
    8-10 strict pull-ups
    Rebuild pulling base after shoulder stabilization
    Week 8··········
    12-15 strict pull-ups
    Strength prerequisite for explosive pulling
    Week 20··········
    False grip hang 20+ sec
    Wrist and forearm conditioning for transition
    Week 16··········
    High pull-ups to sternum
    Explosive pulling height needed for transition
    Week 20··········
    Negative muscle-up (5 sec descent)
    Eccentric control through the transition
    Week 24··········
    First muscle-up
    Bar or rings, any style
    Week 30··········
    3-5 consecutive muscle-ups
    Confident, repeatable reps
    Week 44············
    ◆
    Tuck Planche
    #2···········
  Where You Are
  No planche training history. Shoulder pain limits plank position. Scapular stabilizer weakness identified.······
  Edit········
    Save
    Cancel····
    Planche lean: 4-6 months. Frog stand: 3-4 months. Tuck planche (2-3 sec): 9-12 months. Tuck planche (5-10 sec): 12-15 months. Advanced tuck planche: 15-24 months (stretch goal).···········
    Pain-free plank 60+ sec
    Baseline pressing endurance
    Week 8··········
    Frog stand hold
    Balance and wrist conditioning
    Week 14··········
    Planche lean 20+ degrees
    Progressive forward lean tolerance
    Week 20··········
    Tuck planche 2-3 sec
    First hold with hips level
    Week 36··········
    Tuck planche 5-10 sec
    Solid, repeatable hold
    Week 48··········
    Advanced tuck planche 3-5 sec
    Legs partially extended
    Week 60············
    ●
    Pistol Squat
    #3···········
  Where You Are
  Limited depth on pistol squats. Lateral lunge knee pain. Surgically repaired right Achilles limiting dorsiflexion. Tight hips.······
  Edit········
    Save
    Cancel····
    Pistol to box (16 inch): 8-12 weeks. Pistol to box (8 inch): 16-20 weeks. Full-depth pistol (both legs): 5-8 months. Right leg may lag 2-4 weeks behind left.···········
    Full Cossack squat, no support
    Lateral mobility prerequisite
    Week 8··········
    Pistol to 16-inch box
    Partial-depth single-leg squat
    Week 12··········
    Pistol to 8-inch box
    Deeper single-leg squat
    Week 20··········
    Full pistol with counterbalance
    Complete depth, assisted balance
    Week 28··········
    Full pistol, no counterbalance
    Clean, controlled single-leg squat
    Week 36··········
    Weighted pistol squat
    Loaded single-leg squat
    Week 44············
    ▲
    Handstand
    #4···········
  Where You Are
  Never achieved a handstand. Shoulder pain during overhead loading. Limited thoracic extension. Core work developing.······
  Edit········
    Save
    Cancel····
    Wall handstand 30 sec: 3-4 months. Wall handstand 60 sec with controlled entry: 5-6 months. Freestanding 5-10 sec: 6-9 months. Freestanding 15-30 sec: 9-15 months.···········
    Overhead wall test pass
    Full shoulder range without compensation
    Week 8··········
    Wall handstand 30 sec
    Stomach-to-wall hold
    Week 14··········
    Wall handstand 60 sec
    Extended hold with controlled entry
    Week 22··········
    Freestanding 5-10 sec
    Brief balance holds
    Week 30··········
    Freestanding 15-30 sec
    Confident freestanding balance
    Week 44·······
Roadmap·
Phase 1: Joint Restoration
    Weeks 1-8
    This is the program you're in now. Rebuild shoulder stability, knee resilience, Achilles health, core strength, and thoracic mobility. No skill work yet — your joints aren't ready.·····
✓ Pain-Free Planks
✓ Strict Pull-ups (Phase 1 Gate)
✓ Clean Dips (Phase 1 Gate)
✓ Cossack Squat Full Depth
✓ Single-Leg Balance 30s (Gate)
✓ Wall Dorsiflexion 4+ Inches
✓ Hollow Body Hold 30s (Gate)
✓ Overhead Wall Test (Gate)
All gates passed·····
Phase 2: Strength Prerequisites
    Weeks 9-20 (12 weeks)
    Build the raw strength and positions your skills require. Shoulder strength, straight-arm conditioning, single-leg loading, and wrist preparation. Daily CARs and core work continue as maintenance.·····
✗ Strict Pull-ups (Phase 2 Gate)
✗ Parallel Bar Dips (Phase 2 Gate)
✗ False Grip Hang
✗ Ring Support Hold
✗ Pistol Squat to Box
✗ Wall Handstand Hold
✗ Planche Lean
✗ Scapular Pull-ups······
Phase 3: Skill Acquisition
    Weeks 21-36 (16 weeks)
    Active skill practice begins. Muscle-up transition training, planche lean progressions, pistol squat depth development, and handstand balance work. This is as much neurological as physical.·····
Muscle-ups (Phase 3 Gate)
Tuck Planche Hold
Full Pistol Squat
Freestanding Handstand
Negative Muscle-up
Tuck Planche (Hips Level)······
Phase 4: Refinement & Beyond
    Weeks 37-52+ (ongoing)
    Polish skill quality, add reps, and begin harder progressions. Multiple clean muscle-ups, advanced planche variations, loaded pistol squats, freestanding handstand confidence.·····
Consecutive Muscle-ups
Tuck Planche 10s Hold
Freestanding Handstand 15s
Full Pistol Squat (No Counterbalance)
Advanced Tuck Planche······
Benchmarks··
  Wall Dorsiflexion Test
  Left: 4-5 inches. Right (Achilles): will start lower — track improvement, don't compare sides.
  No results yet·········
  Log Result··················
       Target met··········
    Save······
  Single-Leg Balance (Eyes Closed)
  30 seconds each side. Right ankle will lag — that's expected.
  No results yet·········
  Log Result·············
      No side
      Left
      Right··········
       Target met··········
    Save······
  Hollow Body Hold Time
  Week 1: 10-15s is normal. Week 8 goal: 30-45s.
  No results yet·········
  Log Result··················
       Target met··········
    Save······
  Overhead Reach (Wall Test)
  Thumbs touch wall with back flat = good t-spine and shoulder mobility. If back arches, that's your t-spine restriction.
  No results yet·········
  Log Result··················
       Target met··········
    Save······
  Deep Squat Assessment
  Hips below parallel, heels down, chest up, no pain. Use a phone to film yourself — you'll miss compensations otherwise.
  No results yet·········
  Log Result··················
       Target met··········
    Save······
  90/90 Hip Test
  Both knees within 3-4 inches of floor, spine upright without hands for support.
  No results yet·········
  Log Result··················
       Target met··········
    Save······
  Cross-Body Shoulder Reach
  Fingers touching or overlapping. Note the difference between sides — your tighter side is the priority.
  No results yet·········
  Log Result··················
       Target met··········
    Save······
  Pain-Free Planks
  45+ seconds with zero shoulder pain.
  pass → pass → pass
  Last tested: 0 days ago······
  Log Result··················
       Target met··········
    Save······
  Strict Pull-ups (Phase 1 Gate)
  8-10 strict pull-ups.
  pass → pass → pass
  Last tested: 0 days ago······
  Log Result··················
       Target met··········
    Save······
  Clean Dips (Phase 1 Gate)
  15+ clean dips.
  pass → pass → pass
  Last tested: 0 days ago······
  Log Result··················
       Target met··········
    Save······
  Cossack Squat Full Depth
  Full depth both sides, no support, no pain.
  pass → pass → pass
  Last tested: 0 days ago······
  Log Result··················
       Target met··········
    Save······
  Single-Leg Balance 30s (Gate)
  30 seconds each side, eyes closed.
  pass → pass → pass
  Last tested: 0 days ago······
  Log Result·············
      No side
      Left
      Right··········
       Target met··········
    Save······
  Wall Dorsiflexion 4+ Inches
  4+ inches each side.
  pass → pass → pass
  Last tested: 0 days ago······
  Log Result·············
      No side
      Left
      Right··········
       Target met··········
    Save······
  Hollow Body Hold 30s (Gate)
  30+ seconds, arms overhead.
  pass → pass → pass
  Last tested: 0 days ago······
  Log Result··················
       Target met··········
    Save······
  Overhead Wall Test (Gate)
  Thumbs touch wall, back stays flat.
  pass → pass → pass
  Last tested: 0 days ago······
  Log Result··················
       Target met··········
    Save······
  Strict Pull-ups (Phase 2 Gate)
  12-15 strict pull-ups.
  No results yet·········
  Log Result··················
       Target met··········
    Save······
  Parallel Bar Dips (Phase 2 Gate)
  15-20 parallel bar dips.
  No results yet·········
  Log Result··················
       Target met··········
    Save······
  False Grip Hang
  20+ seconds.
  No results yet·········
  Log Result··················
       Target met··········
    Save······
  Ring Support Hold
  30-second hold with external rotation.
  No results yet·········
  Log Result··················
       Target met··········
    Save······
  Pistol Squat to Box
  Controlled descent and ascent each leg.
  No results yet·········
  Log Result··················
       Target met··········
    Save······
  Wall Handstand Hold
  45-second hold.
  No results yet·········
  Log Result··················
       Target met··········
    Save······
  Planche Lean
  10-second hold at 20+ degrees.
  No results yet·········
  Log Result··················
       Target met··········
    Save······
  Scapular Pull-ups
  3×8 full range on bar.
  No results yet·········
  Log Result··················
       Target met··········
    Save······
  Muscle-ups (Phase 3 Gate)
  1-3 muscle-ups (bar or rings).
  No results yet·········
  Log Result··················
       Target met··········
    Save······
  Tuck Planche Hold
  5-second hold on floor or parallettes.
  No results yet·········
  Log Result··················
       Target met··········
    Save······
  Full Pistol Squat
  Full-depth each leg, controlled tempo.
  No results yet·········
  Log Result··················
       Target met··········
    Save······
  Freestanding Handstand
  20-second hold OR 45-second wall handstand with controlled entry/exit.
  No results yet·········
  Log Result··················
       Target met··········
    Save······
  Negative Muscle-up
  3-second controlled descent.
  No results yet·········
  Log Result··················
       Target met··········
    Save······
  Tuck Planche (Hips Level)
  Hips level with shoulders, held position.
  No results yet·········
  Log Result··················
       Target met··········
    Save······
  Consecutive Muscle-ups
  3-5 consecutive muscle-ups.
  No results yet·········
  Log Result··················
       Target met··········
    Save······
  Tuck Planche 10s Hold
  10+ seconds.
  No results yet·········
  Log Result··················
       Target met··········
    Save······
  Freestanding Handstand 15s
  15+ seconds.
  No results yet·········
  Log Result··················
       Target met··········
    Save······
  Full Pistol Squat (No Counterbalance)
  Full pistol each leg, no counterbalance.
  No results yet·········
  Log Result··················
       Target met··········
    Save······
  Advanced Tuck Planche
  3-5 seconds (stretch goal).
  No results yet·········
  Log Result··················
       Target met··········
    Save·····
"

Call log:
  - Expect "toContainText" with timeout 5000ms
  - waiting for locator('#content')
    9 × locator resolved to <div id="content">…</div>
      - unexpected value "Skills

  
    ★
    Muscle Up
    #1
  
  
    
  Where You Are
  3-5 pull-ups (previously 7-10 before shoulder issues). No muscle-up experience. Shoulder pain during planks and pressing.

    
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
    
✓ Pain-Free Planks
✓ Strict Pull-ups (Phase 1 Gate)
✓ Clean Dips (Phase 1 Gate)
✓ Cossack Squat Full Depth
✓ Single-Leg Balance 30s (Gate)
✓ Wall Dorsiflexion 4+ Inches
✓ Hollow Body Hold 30s (Gate)
✓ Overhead Wall Test (Gate)
All gates passed

  

Phase 2: Strength Prerequisites
    Weeks 9-20 (12 weeks)
    Build the raw strength and positions your skills require. Shoulder strength, straight-arm conditioning, single-leg loading, and wrist preparation. Daily CARs and core work continue as maintenance.
    
✗ Strict Pull-ups (Phase 2 Gate)
✗ Parallel Bar Dips (Phase 2 Gate)
✗ False Grip Hang
✗ Ring Support Hold
✗ Pistol Squat to Box
✗ Wall Handstand Hold
✗ Planche Lean
✗ Scapular Pull-ups


  

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
  No results yet
  
  
  
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
  pass → pass → pass
  Last tested: 0 days ago
  
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  



  Strict Pull-ups (Phase 1 Gate)
  8-10 strict pull-ups.
  pass → pass → pass
  Last tested: 0 days ago
  
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  



  Clean Dips (Phase 1 Gate)
  15+ clean dips.
  pass → pass → pass
  Last tested: 0 days ago
  
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  



  Cossack Squat Full Depth
  Full depth both sides, no support, no pain.
  pass → pass → pass
  Last tested: 0 days ago
  
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  



  Single-Leg Balance 30s (Gate)
  30 seconds each side, eyes closed.
  pass → pass → pass
  Last tested: 0 days ago
  
  
  Log Result
  
    
    
      No side
      Left
      Right
    
    
       Target met
    
    
    Save
  



  Wall Dorsiflexion 4+ Inches
  4+ inches each side.
  pass → pass → pass
  Last tested: 0 days ago
  
  
  Log Result
  
    
    
      No side
      Left
      Right
    
    
       Target met
    
    
    Save
  



  Hollow Body Hold 30s (Gate)
  30+ seconds, arms overhead.
  pass → pass → pass
  Last tested: 0 days ago
  
  
  Log Result
  
    
    
    
       Target met
    
    
    Save
  



  Overhead Wall Test (Gate)
  Thumbs touch wall, back stays flat.
  pass → pass → pass
  Last tested: 0 days ago
  
  
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
            - generic [ref=e16]: 3-5 pull-ups (previously 7-10 before shoulder issues). No muscle-up experience. Shoulder pain during planks and pressing.
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
              - generic [ref=e88]: ✓ Pain-Free Planks
              - generic [ref=e89]: ✓ Strict Pull-ups (Phase 1 Gate)
              - generic [ref=e90]: ✓ Clean Dips (Phase 1 Gate)
              - generic [ref=e91]: ✓ Cossack Squat Full Depth
              - generic [ref=e92]: ✓ Single-Leg Balance 30s (Gate)
              - generic [ref=e93]: ✓ Wall Dorsiflexion 4+ Inches
              - generic [ref=e94]: ✓ Hollow Body Hold 30s (Gate)
              - generic [ref=e95]: ✓ Overhead Wall Test (Gate)
              - generic [ref=e96]: All gates passed
          - generic [ref=e99]:
            - generic [ref=e100]: "Phase 2: Strength Prerequisites"
            - generic [ref=e101]: Weeks 9-20 (12 weeks)
            - generic [ref=e102]: Build the raw strength and positions your skills require. Shoulder strength, straight-arm conditioning, single-leg loading, and wrist preparation. Daily CARs and core work continue as maintenance.
            - generic [ref=e103]:
              - generic [ref=e104]: ✗ Strict Pull-ups (Phase 2 Gate)
              - generic [ref=e105]: ✗ Parallel Bar Dips (Phase 2 Gate)
              - generic [ref=e106]: ✗ False Grip Hang
              - generic [ref=e107]: ✗ Ring Support Hold
              - generic [ref=e108]: ✗ Pistol Squat to Box
              - generic [ref=e109]: ✗ Wall Handstand Hold
              - generic [ref=e110]: ✗ Planche Lean
              - generic [ref=e111]: ✗ Scapular Pull-ups
          - generic [ref=e114]:
            - generic [ref=e115]: "Phase 3: Skill Acquisition"
            - generic [ref=e116]: Weeks 21-36 (16 weeks)
            - generic [ref=e117]: Active skill practice begins. Muscle-up transition training, planche lean progressions, pistol squat depth development, and handstand balance work. This is as much neurological as physical.
            - generic [ref=e118]:
              - generic [ref=e119]: Muscle-ups (Phase 3 Gate)
              - generic [ref=e120]: Tuck Planche Hold
              - generic [ref=e121]: Full Pistol Squat
              - generic [ref=e122]: Freestanding Handstand
              - generic [ref=e123]: Negative Muscle-up
              - generic [ref=e124]: Tuck Planche (Hips Level)
          - generic [ref=e127]:
            - generic [ref=e128]: "Phase 4: Refinement & Beyond"
            - generic [ref=e129]: Weeks 37-52+ (ongoing)
            - generic [ref=e130]: Polish skill quality, add reps, and begin harder progressions. Multiple clean muscle-ups, advanced planche variations, loaded pistol squats, freestanding handstand confidence.
            - generic [ref=e131]:
              - generic [ref=e132]: Consecutive Muscle-ups
              - generic [ref=e133]: Tuck Planche 10s Hold
              - generic [ref=e134]: Freestanding Handstand 15s
              - generic [ref=e135]: Full Pistol Squat (No Counterbalance)
              - generic [ref=e136]: Advanced Tuck Planche
      - generic [ref=e137]: Benchmarks
      - generic [ref=e138]:
        - generic [ref=e139]:
          - generic [ref=e140]: Wall Dorsiflexion Test
          - generic [ref=e141]: "Left: 4-5 inches. Right (Achilles): will start lower — track improvement, don't compare sides."
          - generic [ref=e142]: No results yet
          - button "Log Result" [ref=e144] [cursor=pointer]
        - generic [ref=e145]:
          - generic [ref=e146]: Single-Leg Balance (Eyes Closed)
          - generic [ref=e147]: 30 seconds each side. Right ankle will lag — that's expected.
          - generic [ref=e148]: No results yet
          - button "Log Result" [ref=e150] [cursor=pointer]
        - generic [ref=e151]:
          - generic [ref=e152]: Hollow Body Hold Time
          - generic [ref=e153]: "Week 1: 10-15s is normal. Week 8 goal: 30-45s."
          - generic [ref=e154]: No results yet
          - button "Log Result" [ref=e156] [cursor=pointer]
        - generic [ref=e157]:
          - generic [ref=e158]: Overhead Reach (Wall Test)
          - generic [ref=e159]: Thumbs touch wall with back flat = good t-spine and shoulder mobility. If back arches, that's your t-spine restriction.
          - generic [ref=e160]: No results yet
          - button "Log Result" [ref=e162] [cursor=pointer]
        - generic [ref=e163]:
          - generic [ref=e164]: Deep Squat Assessment
          - generic [ref=e165]: Hips below parallel, heels down, chest up, no pain. Use a phone to film yourself — you'll miss compensations otherwise.
          - generic [ref=e166]: No results yet
          - button "Log Result" [ref=e168] [cursor=pointer]
        - generic [ref=e169]:
          - generic [ref=e170]: 90/90 Hip Test
          - generic [ref=e171]: Both knees within 3-4 inches of floor, spine upright without hands for support.
          - generic [ref=e172]: No results yet
          - button "Log Result" [ref=e174] [cursor=pointer]
        - generic [ref=e175]:
          - generic [ref=e176]: Cross-Body Shoulder Reach
          - generic [ref=e177]: Fingers touching or overlapping. Note the difference between sides — your tighter side is the priority.
          - generic [ref=e178]: No results yet
          - button "Log Result" [ref=e180] [cursor=pointer]
        - generic [ref=e181]:
          - generic [ref=e182]: Pain-Free Planks
          - generic [ref=e183]: 45+ seconds with zero shoulder pain.
          - generic [ref=e184]: pass → pass → pass
          - generic [ref=e185]: "Last tested: 0 days ago"
          - button "Log Result" [ref=e187] [cursor=pointer]
        - generic [ref=e188]:
          - generic [ref=e189]: Strict Pull-ups (Phase 1 Gate)
          - generic [ref=e190]: 8-10 strict pull-ups.
          - generic [ref=e191]: pass → pass → pass
          - generic [ref=e192]: "Last tested: 0 days ago"
          - button "Log Result" [ref=e194] [cursor=pointer]
        - generic [ref=e195]:
          - generic [ref=e196]: Clean Dips (Phase 1 Gate)
          - generic [ref=e197]: 15+ clean dips.
          - generic [ref=e198]: pass → pass → pass
          - generic [ref=e199]: "Last tested: 0 days ago"
          - button "Log Result" [ref=e201] [cursor=pointer]
        - generic [ref=e202]:
          - generic [ref=e203]: Cossack Squat Full Depth
          - generic [ref=e204]: Full depth both sides, no support, no pain.
          - generic [ref=e205]: pass → pass → pass
          - generic [ref=e206]: "Last tested: 0 days ago"
          - button "Log Result" [ref=e208] [cursor=pointer]
        - generic [ref=e209]:
          - generic [ref=e210]: Single-Leg Balance 30s (Gate)
          - generic [ref=e211]: 30 seconds each side, eyes closed.
          - generic [ref=e212]: pass → pass → pass
          - generic [ref=e213]: "Last tested: 0 days ago"
          - button "Log Result" [ref=e215] [cursor=pointer]
        - generic [ref=e216]:
          - generic [ref=e217]: Wall Dorsiflexion 4+ Inches
          - generic [ref=e218]: 4+ inches each side.
          - generic [ref=e219]: pass → pass → pass
          - generic [ref=e220]: "Last tested: 0 days ago"
          - button "Log Result" [ref=e222] [cursor=pointer]
        - generic [ref=e223]:
          - generic [ref=e224]: Hollow Body Hold 30s (Gate)
          - generic [ref=e225]: 30+ seconds, arms overhead.
          - generic [ref=e226]: pass → pass → pass
          - generic [ref=e227]: "Last tested: 0 days ago"
          - button "Log Result" [ref=e229] [cursor=pointer]
        - generic [ref=e230]:
          - generic [ref=e231]: Overhead Wall Test (Gate)
          - generic [ref=e232]: Thumbs touch wall, back stays flat.
          - generic [ref=e233]: pass → pass → pass
          - generic [ref=e234]: "Last tested: 0 days ago"
          - button "Log Result" [ref=e236] [cursor=pointer]
        - generic [ref=e237]:
          - generic [ref=e238]: Strict Pull-ups (Phase 2 Gate)
          - generic [ref=e239]: 12-15 strict pull-ups.
          - generic [ref=e240]: No results yet
          - button "Log Result" [ref=e242] [cursor=pointer]
        - generic [ref=e243]:
          - generic [ref=e244]: Parallel Bar Dips (Phase 2 Gate)
          - generic [ref=e245]: 15-20 parallel bar dips.
          - generic [ref=e246]: No results yet
          - button "Log Result" [ref=e248] [cursor=pointer]
        - generic [ref=e249]:
          - generic [ref=e250]: False Grip Hang
          - generic [ref=e251]: 20+ seconds.
          - generic [ref=e252]: No results yet
          - button "Log Result" [ref=e254] [cursor=pointer]
        - generic [ref=e255]:
          - generic [ref=e256]: Ring Support Hold
          - generic [ref=e257]: 30-second hold with external rotation.
          - generic [ref=e258]: No results yet
          - button "Log Result" [ref=e260] [cursor=pointer]
        - generic [ref=e261]:
          - generic [ref=e262]: Pistol Squat to Box
          - generic [ref=e263]: Controlled descent and ascent each leg.
          - generic [ref=e264]: No results yet
          - button "Log Result" [ref=e266] [cursor=pointer]
        - generic [ref=e267]:
          - generic [ref=e268]: Wall Handstand Hold
          - generic [ref=e269]: 45-second hold.
          - generic [ref=e270]: No results yet
          - button "Log Result" [ref=e272] [cursor=pointer]
        - generic [ref=e273]:
          - generic [ref=e274]: Planche Lean
          - generic [ref=e275]: 10-second hold at 20+ degrees.
          - generic [ref=e276]: No results yet
          - button "Log Result" [ref=e278] [cursor=pointer]
        - generic [ref=e279]:
          - generic [ref=e280]: Scapular Pull-ups
          - generic [ref=e281]: 3×8 full range on bar.
          - generic [ref=e282]: No results yet
          - button "Log Result" [ref=e284] [cursor=pointer]
        - generic [ref=e285]:
          - generic [ref=e286]: Muscle-ups (Phase 3 Gate)
          - generic [ref=e287]: 1-3 muscle-ups (bar or rings).
          - generic [ref=e288]: No results yet
          - button "Log Result" [ref=e290] [cursor=pointer]
        - generic [ref=e291]:
          - generic [ref=e292]: Tuck Planche Hold
          - generic [ref=e293]: 5-second hold on floor or parallettes.
          - generic [ref=e294]: No results yet
          - button "Log Result" [ref=e296] [cursor=pointer]
        - generic [ref=e297]:
          - generic [ref=e298]: Full Pistol Squat
          - generic [ref=e299]: Full-depth each leg, controlled tempo.
          - generic [ref=e300]: No results yet
          - button "Log Result" [ref=e302] [cursor=pointer]
        - generic [ref=e303]:
          - generic [ref=e304]: Freestanding Handstand
          - generic [ref=e305]: 20-second hold OR 45-second wall handstand with controlled entry/exit.
          - generic [ref=e306]: No results yet
          - button "Log Result" [ref=e308] [cursor=pointer]
        - generic [ref=e309]:
          - generic [ref=e310]: Negative Muscle-up
          - generic [ref=e311]: 3-second controlled descent.
          - generic [ref=e312]: No results yet
          - button "Log Result" [ref=e314] [cursor=pointer]
        - generic [ref=e315]:
          - generic [ref=e316]: Tuck Planche (Hips Level)
          - generic [ref=e317]: Hips level with shoulders, held position.
          - generic [ref=e318]: No results yet
          - button "Log Result" [ref=e320] [cursor=pointer]
        - generic [ref=e321]:
          - generic [ref=e322]: Consecutive Muscle-ups
          - generic [ref=e323]: 3-5 consecutive muscle-ups.
          - generic [ref=e324]: No results yet
          - button "Log Result" [ref=e326] [cursor=pointer]
        - generic [ref=e327]:
          - generic [ref=e328]: Tuck Planche 10s Hold
          - generic [ref=e329]: 10+ seconds.
          - generic [ref=e330]: No results yet
          - button "Log Result" [ref=e332] [cursor=pointer]
        - generic [ref=e333]:
          - generic [ref=e334]: Freestanding Handstand 15s
          - generic [ref=e335]: 15+ seconds.
          - generic [ref=e336]: No results yet
          - button "Log Result" [ref=e338] [cursor=pointer]
        - generic [ref=e339]:
          - generic [ref=e340]: Full Pistol Squat (No Counterbalance)
          - generic [ref=e341]: Full pistol each leg, no counterbalance.
          - generic [ref=e342]: No results yet
          - button "Log Result" [ref=e344] [cursor=pointer]
        - generic [ref=e345]:
          - generic [ref=e346]: Advanced Tuck Planche
          - generic [ref=e347]: 3-5 seconds (stretch goal).
          - generic [ref=e348]: No results yet
          - button "Log Result" [ref=e350] [cursor=pointer]
  - navigation [ref=e351]:
    - link "Today" [ref=e352] [cursor=pointer]:
      - /url: /
      - img [ref=e353]
      - generic [ref=e355]: Today
    - link "Progress" [ref=e356] [cursor=pointer]:
      - /url: /progress
      - img [ref=e357]
      - generic [ref=e359]: Progress
    - link "Program" [ref=e360] [cursor=pointer]:
      - /url: /program
      - img [ref=e361]
      - generic [ref=e364]: Program
```

# Test source

```ts
  153 |         headers: { "Content-Type": "application/x-www-form-urlencoded" },
  154 |         data: "value=2.5&passed=false&side=right&notes=Right+Achilles+side",
  155 |       }
  156 |     );
  157 | 
  158 |     await page.goto("/progress");
  159 |     await page.waitForLoadState("networkidle");
  160 | 
  161 |     const content = page.locator("#content");
  162 |     await expect(content).toContainText(/left/i);
  163 |     await expect(content).toContainText(/right/i);
  164 |   });
  165 | });
  166 | 
  167 | test.describe("Phase advancement", () => {
  168 |   test.beforeAll(async ({ browser }) => {
  169 |     const page = await browser.newPage();
  170 |     try {
  171 |       await seedDatabase(page);
  172 |     } catch {
  173 |       // Seed may fail if user already exists
  174 |     } finally {
  175 |       await page.close();
  176 |     }
  177 |   });
  178 | 
  179 |   test("POST /api/advance-phase/nonexistent-xyz returns 404", async ({ page }) => {
  180 |     const response = await page.request.post(
  181 |       `${BASE_URL}/api/advance-phase/nonexistent-phase-xyz`
  182 |     );
  183 |     expect(response.status()).toBe(404);
  184 |   });
  185 | 
  186 |   test("POST /api/advance-phase/:id without gates passed returns 400", async ({ page }) => {
  187 |     // Phase 2 gates are not passed — should fail
  188 |     const response = await page.request.post(
  189 |       `${BASE_URL}/api/advance-phase/phase2`
  190 |     );
  191 |     expect(response.status()).toBe(400);
  192 |     const body = await response.text();
  193 |     expect(body).toContain("Gates not passed");
  194 |   });
  195 | 
  196 |   test("ready-to-advance prompt appears when all gates passed", async ({ page }) => {
  197 |     // Log all Phase 1 gate benchmarks
  198 |     for (const gateId of PHASE1_GATE_IDS) {
  199 |       await page.request.post(
  200 |         `${BASE_URL}/api/log-benchmark/${gateId}`,
  201 |         {
  202 |           headers: { "Content-Type": "application/x-www-form-urlencoded" },
  203 |           data: "value=pass&passed=true",
  204 |         }
  205 |       );
  206 |     }
  207 | 
  208 |     await page.goto("/progress");
  209 |     await page.waitForLoadState("networkidle");
  210 |     await expect(page.locator("#content")).toContainText(/ready to advance/i);
  211 |   });
  212 | 
  213 |   test("after logging all Phase 1 gate benchmarks, advance-phase returns 202", async ({ page }) => {
  214 |     // Log all 8 Phase 1 gate benchmarks as passed
  215 |     for (const gateId of PHASE1_GATE_IDS) {
  216 |       const resp = await page.request.post(
  217 |         `${BASE_URL}/api/log-benchmark/${gateId}`,
  218 |         {
  219 |           headers: { "Content-Type": "application/x-www-form-urlencoded" },
  220 |           data: "value=pass&passed=true",
  221 |         }
  222 |       );
  223 |       expect(resp.status()).toBe(202);
  224 |     }
  225 | 
  226 |     // Now advance Phase 1
  227 |     const response = await page.request.post(
  228 |       `${BASE_URL}/api/advance-phase/phase1`
  229 |     );
  230 |     expect(response.status()).toBe(202);
  231 |   });
  232 | 
  233 |   test("phase change persists on /progress page reload", async ({ page }) => {
  234 |     // Ensure Phase 1 gates are passed and phase is advanced (idempotent setup)
  235 |     for (const gateId of PHASE1_GATE_IDS) {
  236 |       await page.request.post(
  237 |         `${BASE_URL}/api/log-benchmark/${gateId}`,
  238 |         {
  239 |           headers: { "Content-Type": "application/x-www-form-urlencoded" },
  240 |           data: "value=pass&passed=true",
  241 |         }
  242 |       );
  243 |     }
  244 |     // Advance may fail if already advanced — that's fine
  245 |     await page.request.post(`${BASE_URL}/api/advance-phase/phase1`);
  246 | 
  247 |     // Reload progress page
  248 |     await page.goto("/progress");
  249 |     await page.waitForLoadState("networkidle");
  250 | 
  251 |     const content = page.locator("#content");
  252 |     // Phase 1 should show completed status
> 253 |     await expect(content).toContainText(/completed/i);
      |                           ^ Error: expect(locator).toContainText(expected) failed
  254 |   });
  255 | 
  256 |   test("cannot re-advance already completed phase (400)", async ({ page }) => {
  257 |     // Ensure Phase 1 is already advanced (from prior test or setup)
  258 |     for (const gateId of PHASE1_GATE_IDS) {
  259 |       await page.request.post(
  260 |         `${BASE_URL}/api/log-benchmark/${gateId}`,
  261 |         {
  262 |           headers: { "Content-Type": "application/x-www-form-urlencoded" },
  263 |           data: "value=pass&passed=true",
  264 |         }
  265 |       );
  266 |     }
  267 |     await page.request.post(`${BASE_URL}/api/advance-phase/phase1`);
  268 | 
  269 |     // Try to re-advance Phase 1 — should fail
  270 |     const response = await page.request.post(
  271 |       `${BASE_URL}/api/advance-phase/phase1`
  272 |     );
  273 |     expect(response.status()).toBe(400);
  274 |     const body = await response.text();
  275 |     expect(body).toContain("already completed");
  276 |   });
  277 | });
  278 | 
```