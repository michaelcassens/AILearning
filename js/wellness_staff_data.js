// ═══════════════════════════════════════════════════════════════
// WELLNESS JOURNEY — Faculty & Staff Edition Data
// 35 scenarios (7 days × 3 + alternates) + 15 random events
// ═══════════════════════════════════════════════════════════════

const WELLNESS_CONFIG = {
  version: 'staff',
  title: 'Faculty & Staff Edition',
  subtitle: 'Navigate your work week — balance career, relationships, and self-care',
  reportIntro: 'Here\'s how your work week went. Remember: wellness is a journey, not a destination.',

  tips: {
    physical:      { high: 'You\'re prioritizing your body — keep up those healthy habits!', low: 'Try a walking meeting or a 10-minute stretch break between tasks.' },
    emotional:     { high: 'Great emotional awareness! Keep those self-care practices.', low: 'Consider setting clearer boundaries and checking in with yourself daily.' },
    social:        { high: 'Your relationships are thriving! Keep investing in connections.', low: 'Try having lunch with a colleague or joining a campus interest group.' },
    intellectual:  { high: 'You\'re staying sharp and curious! Keep learning.', low: 'Explore a webinar, podcast, or book outside your usual field.' },
    spiritual:     { high: 'You\'re connected to your deeper purpose at work!', low: 'Reflect on why you chose this career. Reconnect with what matters most to you.' },
    occupational:  { high: 'You\'re engaged and productive! Nice work-life balance.', low: 'Review your workload — are you saying yes to too much? Talk with your supervisor.' },
    financial:     { high: 'Smart financial planning! Keep building that security.', low: 'Review your retirement contributions and consider a financial wellness workshop.' },
    environmental: { high: 'Your workspace is supporting your productivity!', low: 'A few small changes to your workspace can boost focus and comfort.' }
  },

  extraAchievements: [
    { id: 'mentor_star', name: 'Mentor Star', desc: 'Social and Occupational both above 85', icon: '🌟',
      check: gs => gs.wellness.social >= 85 && gs.wellness.occupational >= 85 },
    { id: 'work_life_pro', name: 'Work-Life Pro', desc: 'Physical and Emotional both above 80', icon: '⚖',
      check: gs => gs.wellness.physical >= 80 && gs.wellness.emotional >= 80 }
  ],

  days: [
    // ═══ DAY 1: Monday Morning Rush ═══
    {
      dayNum: 1, theme: 'Monday Morning Rush',
      narrative: 'A new work week begins. Time to set the tone for the days ahead.',
      slots: [
        {
          time: 'morning', id: 'd1_morning',
          narrative: 'Your alarm goes off at 6:15 AM. The commute takes 35 minutes. You could get to work early, or use the morning for yourself.',
          choices: [
            {
              text: 'Wake up 30 minutes early for a brisk morning walk before getting ready',
              effects: { physical: 7, emotional: 4, environmental: 3 },
              miniActivity: 'breathingBubble',
              followUp: 'The cool morning air and movement wake you up naturally. You arrive at work feeling energized and clear-headed.'
            },
            {
              text: 'Get to work early to organize your week and tackle emails before others arrive',
              effects: { occupational: 7, intellectual: 3, emotional: -2 },
              miniActivity: null,
              followUp: 'By 8:30 you\'ve cleared your inbox and planned your week. Productive, but you skipped breakfast again.'
            },
            {
              text: 'Sleep until the last possible minute — mornings are not your thing',
              effects: { physical: 2, emotional: -3, occupational: -2 },
              miniActivity: null,
              followUp: 'You rush through everything and arrive slightly frazzled. The week is already starting on a stressful note.'
            }
          ]
        },
        {
          time: 'afternoon', id: 'd1_afternoon',
          narrative: 'Back-to-back meetings fill your morning. At lunch, a colleague invites you to eat outside. You also have expense reports due today.',
          choices: [
            {
              text: 'Join your colleague for an outdoor lunch — human connection recharges you',
              effects: { social: 6, emotional: 4, physical: 3, environmental: 2, occupational: -3 },
              miniActivity: null,
              followUp: 'Fresh air and meaningful conversation over lunch. Your colleague shares a personal challenge and you connect deeply.'
            },
            {
              text: 'Eat at your desk and knock out the expense reports',
              effects: { occupational: 6, financial: 3, social: -3, physical: -2 },
              miniActivity: null,
              followUp: 'Reports done! But eating while staring at spreadsheets isn\'t exactly a nourishing experience.'
            },
            {
              text: 'Quick lunch in the break room, then a 10-minute walk around the building before the reports',
              effects: { physical: 4, emotional: 3, occupational: 3, social: 2 },
              miniActivity: null,
              followUp: 'A smart compromise. The short walk clears your head and you finish the reports more efficiently.'
            }
          ]
        },
        {
          time: 'evening', id: 'd1_evening',
          narrative: 'You get home at 5:45. Your family/partner suggests ordering takeout. You also have a pile of mail to sort and bills to review.',
          choices: [
            {
              text: 'Cook a healthy meal together — it\'s quality time AND nutrition',
              effects: { physical: 5, social: 5, emotional: 4, financial: 3 },
              miniActivity: null,
              followUp: 'Chopping vegetables while chatting about the day is surprisingly therapeutic. The meal is delicious and cheaper than takeout.'
            },
            {
              text: 'Order takeout and spend the evening reviewing bills and financial planning',
              effects: { financial: 7, intellectual: 2, physical: -2, social: -2 },
              miniActivity: 'budgetBalancer',
              followUp: 'You discover a subscription you forgot about and set up automatic savings. Financially productive but not the coziest evening.'
            },
            {
              text: 'Order takeout and fully disconnect — family game night instead',
              effects: { social: 7, emotional: 6, spiritual: 2, financial: -4 },
              miniActivity: null,
              followUp: 'Laughter fills the house as you play board games. The $40 takeout is forgotten in the joy of connection.'
            }
          ]
        }
      ]
    },

    // ═══ DAY 2: Meeting Marathon ═══
    {
      dayNum: 2, theme: 'Meeting Marathon',
      narrative: 'Tuesday brings a packed calendar and opportunities to navigate workplace dynamics.',
      slots: [
        {
          time: 'morning', id: 'd2_morning',
          narrative: 'You have four meetings scheduled before lunch. The first is a contentious budget review where your department may face cuts.',
          choices: [
            {
              text: 'Prepare thoroughly with data and advocate confidently for your team\'s needs',
              effects: { occupational: 7, intellectual: 4, emotional: 3, social: 2 },
              miniActivity: null,
              followUp: 'Your preparation pays off. Leadership is impressed by your data-driven approach and your team gets to keep key resources.'
            },
            {
              text: 'Stay quiet and let others do the talking — pick your battles',
              effects: { emotional: -3, occupational: -4, social: -2 },
              miniActivity: null,
              followUp: 'The meeting goes poorly for your department. You wish you had spoken up but the moment has passed.'
            },
            {
              text: 'Collaborate with other department heads beforehand to present a united front',
              effects: { social: 6, occupational: 5, intellectual: 3, emotional: 2 },
              miniActivity: 'socialWeb',
              followUp: 'Coalition-building works brilliantly. Together you negotiate a fair outcome for all departments involved.'
            }
          ]
        },
        {
          time: 'afternoon', id: 'd2_afternoon',
          narrative: 'A junior colleague asks you to mentor them on a project. You already have two deadlines this week and a committee meeting at 3 PM.',
          choices: [
            {
              text: 'Agree to mentor them and schedule a 30-minute session tomorrow',
              effects: { social: 7, occupational: 4, emotional: 3, spiritual: 3, physical: -2 },
              miniActivity: null,
              followUp: 'Your colleague is deeply grateful. Teaching others reinforces your own expertise and builds meaningful relationships.'
            },
            {
              text: 'Politely decline and suggest another senior colleague who has more bandwidth',
              effects: { occupational: 3, emotional: -2, social: -3 },
              miniActivity: null,
              followUp: 'You protected your time, but feel a twinge of guilt walking past their desk later.'
            },
            {
              text: 'Share your project templates and written guides as a starting point',
              effects: { intellectual: 4, occupational: 3, social: 3 },
              miniActivity: null,
              followUp: 'A practical middle ground. They can learn from your resources and come back with specific questions.'
            }
          ]
        },
        {
          time: 'evening', id: 'd2_evening',
          narrative: 'After a draining day of meetings, you get home feeling emotionally depleted. Your friend invites you to a yoga class, but the couch is calling.',
          choices: [
            {
              text: 'Go to yoga — your body and mind need the release',
              effects: { physical: 7, emotional: 5, spiritual: 4, social: 3 },
              miniActivity: 'breathingBubble',
              followUp: 'The stretching and breathing melt away the meeting tension. You leave feeling like a different person than when you walked in.'
            },
            {
              text: 'Couch time with a good show — you\'ve earned some pure relaxation',
              effects: { emotional: 3, physical: -2, social: -2 },
              miniActivity: null,
              followUp: 'Three episodes later, you feel rested but slightly guilty about being sedentary all evening.'
            },
            {
              text: 'Take a warm bath, do some light stretching, and journal about the day',
              effects: { emotional: 6, physical: 3, spiritual: 4 },
              miniActivity: 'gratitudeGarden',
              followUp: 'The warm water and quiet reflection help you process the day. You write down three things that went well.'
            }
          ]
        }
      ]
    },

    // ═══ DAY 3: Mentoring & Development ═══
    {
      dayNum: 3, theme: 'Mentoring & Development',
      narrative: 'Wednesday brings professional growth opportunities and mentoring moments.',
      slots: [
        {
          time: 'morning', id: 'd3_morning',
          narrative: 'HR announces a professional development workshop this morning on leadership skills. It conflicts with your regular team standup.',
          choices: [
            {
              text: 'Attend the workshop — investing in your growth benefits everyone long-term',
              effects: { intellectual: 7, occupational: 5, spiritual: 2 },
              miniActivity: null,
              followUp: 'The workshop introduces a new framework for giving feedback. You take detailed notes and plan to share with your team.'
            },
            {
              text: 'Skip the workshop and attend your standup — your team needs you',
              effects: { occupational: 4, social: 4, intellectual: -2 },
              miniActivity: null,
              followUp: 'Your team appreciates your presence. But you hear colleagues raving about the workshop later.'
            },
            {
              text: 'Ask a team member to lead standup and attend the first half of the workshop',
              effects: { intellectual: 4, occupational: 4, social: 3 },
              miniActivity: null,
              followUp: 'Delegating the standup empowers your team member. You get the key takeaways from the workshop too. Smart delegation!'
            }
          ]
        },
        {
          time: 'afternoon', id: 'd3_afternoon',
          narrative: 'A student (or direct report) is struggling and comes to you visibly upset. They\'re considering dropping out (or quitting). You have a report due by end of day.',
          choices: [
            {
              text: 'Close your laptop, give them your full attention, and listen deeply',
              effects: { social: 8, emotional: 5, spiritual: 5, occupational: -5 },
              miniActivity: null,
              followUp: 'Your undivided attention makes all the difference. They leave feeling heard and supported. The report will have to wait.'
            },
            {
              text: 'Listen for 15 minutes, then connect them with the appropriate support resources',
              effects: { social: 5, emotional: 3, spiritual: 3, occupational: -1 },
              miniActivity: null,
              followUp: 'You provide a caring ear and a clear path forward. They seem relieved to know there are professional resources available.'
            },
            {
              text: 'Ask if they can come back tomorrow — you acknowledge their feelings but really need to finish the report',
              effects: { occupational: 5, emotional: -4, social: -5, spiritual: -3 },
              miniActivity: null,
              followUp: 'The report gets done on time, but you can\'t shake the look on their face when you asked them to come back.'
            }
          ]
        },
        {
          time: 'evening', id: 'd3_evening',
          narrative: 'A colleague invites you to a networking dinner with professionals from your field. It costs $45 per person. You also promised to help your child with homework.',
          choices: [
            {
              text: 'Attend the networking dinner — these connections could be career-changing',
              effects: { occupational: 6, social: 5, intellectual: 3, financial: -4, emotional: -3 },
              miniActivity: null,
              followUp: 'You meet two incredible professionals and exchange contact info. But missing homework time weighs on you.'
            },
            {
              text: 'Stay home and help with homework — family comes first',
              effects: { social: 5, emotional: 6, spiritual: 4, occupational: -2 },
              miniActivity: null,
              followUp: 'Watching the lightbulb moment when your child finally gets the concept is priceless. No networking event can compete.'
            },
            {
              text: 'Help with homework first, then join the dinner late for dessert and networking',
              effects: { social: 4, occupational: 3, emotional: 3, financial: -2 },
              miniActivity: null,
              followUp: 'You make it work! Homework done, and you still catch the last hour of networking. Tired but satisfied.'
            }
          ]
        }
      ]
    },

    // ═══ DAY 4: Workplace Wellness ═══
    {
      dayNum: 4, theme: 'Workplace Wellness',
      narrative: 'Thursday focuses on creating a healthier work environment for yourself and others.',
      slots: [
        {
          time: 'morning', id: 'd4_morning',
          narrative: 'The campus wellness committee is looking for department representatives. There\'s also a standing desk and ergonomic chair program you could sign up for.',
          choices: [
            {
              text: 'Volunteer for the wellness committee — be a champion for workplace health',
              effects: { social: 5, occupational: 4, environmental: 4, spiritual: 3 },
              miniActivity: null,
              followUp: 'You join a passionate group of colleagues committed to making campus a healthier place. Your ideas are welcomed enthusiastically.'
            },
            {
              text: 'Sign up for the ergonomic program — upgrade your personal workspace',
              effects: { environmental: 7, physical: 5, occupational: 3 },
              miniActivity: 'deskOrganizer',
              followUp: 'A new standing desk and ergonomic assessment transform your workspace. Your back already thanks you.'
            },
            {
              text: 'Both sound great but you\'re overcommitted — focus on your current responsibilities',
              effects: { occupational: 3, emotional: 2, environmental: -2 },
              miniActivity: null,
              followUp: 'Sometimes the best thing you can do for your wellness is to not take on more. Boundaries are healthy.'
            }
          ]
        },
        {
          time: 'afternoon', id: 'd4_afternoon',
          narrative: 'You notice a colleague has been unusually quiet and withdrawn lately. They\'re eating alone at their desk. You have free time before your next meeting.',
          choices: [
            {
              text: 'Invite them for a coffee walk and check in — "Hey, how are you really doing?"',
              effects: { social: 7, emotional: 5, spiritual: 4, physical: 2 },
              miniActivity: null,
              followUp: 'They open up about feeling overwhelmed. Just knowing someone noticed and cared makes a huge difference. You share coping strategies.'
            },
            {
              text: 'Send them a kind email with resources for the Employee Assistance Program',
              effects: { social: 3, emotional: 2, occupational: 2 },
              miniActivity: null,
              followUp: 'A thoughtful gesture, though a bit impersonal. They reply with a grateful thank you.'
            },
            {
              text: 'Respect their space — everyone has off days and may not want to be approached',
              effects: { emotional: -1, social: -2, spiritual: -1 },
              miniActivity: null,
              followUp: 'You go back to work. Later, you overhear them telling someone they wish people would check on them more often.'
            }
          ]
        },
        {
          time: 'evening', id: 'd4_evening',
          narrative: 'Your campus is hosting an evening wellness fair with free health screenings, chair massages, and stress management workshops.',
          choices: [
            {
              text: 'Attend the wellness fair — take advantage of the free health resources',
              effects: { physical: 5, emotional: 4, intellectual: 3, financial: 3 },
              miniActivity: null,
              followUp: 'The health screening reveals good numbers, and the 10-minute chair massage is heavenly. You pick up great stress management tips.'
            },
            {
              text: 'Skip the fair and go for a run or bike ride — you prefer your own wellness routine',
              effects: { physical: 7, emotional: 3, environmental: 3 },
              miniActivity: 'stepChallenge',
              followUp: 'The endorphin rush from your workout is unbeatable. You feel strong and capable.'
            },
            {
              text: 'Head home for a quiet evening of cooking and relaxation',
              effects: { emotional: 5, physical: 3, spiritual: 3, social: -2 },
              miniActivity: null,
              followUp: 'A nourishing homemade meal and early bedtime. Your body and mind appreciate the downtime.'
            }
          ]
        }
      ]
    },

    // ═══ DAY 5: Budget & Planning ═══
    {
      dayNum: 5, theme: 'Budget & Planning Review',
      narrative: 'Friday brings financial considerations and end-of-week planning.',
      slots: [
        {
          time: 'morning', id: 'd5_morning',
          narrative: 'Paycheck day! You also receive a reminder about open enrollment for benefits. Your retirement contribution hasn\'t been reviewed in two years.',
          choices: [
            {
              text: 'Spend 30 minutes reviewing your benefits and increasing your retirement contribution',
              effects: { financial: 8, intellectual: 3, occupational: 2 },
              miniActivity: 'budgetBalancer',
              followUp: 'You discover you\'re not maximizing the employer match! A quick adjustment means thousands more by retirement.'
            },
            {
              text: 'File it away for later — Friday mornings are for getting real work done',
              effects: { occupational: 4, financial: -3 },
              miniActivity: null,
              followUp: 'Productive morning, but that benefits enrollment deadline is approaching fast.'
            },
            {
              text: 'Schedule a meeting with HR benefits counselor next week for a thorough review',
              effects: { financial: 4, occupational: 2, intellectual: 2 },
              miniActivity: null,
              followUp: 'Smart move! A professional can help you optimize your benefits package. You book a Tuesday slot.'
            }
          ]
        },
        {
          time: 'afternoon', id: 'd5_afternoon',
          narrative: 'Your supervisor asks if you\'d like to present at an upcoming conference. It would mean extra preparation but great visibility for your career.',
          choices: [
            {
              text: 'Accept enthusiastically! This is an incredible opportunity for growth',
              effects: { occupational: 8, intellectual: 5, emotional: 3, physical: -3 },
              miniActivity: null,
              followUp: 'You start brainstorming presentation ideas. The adrenaline of a new challenge is invigorating!'
            },
            {
              text: 'Negotiate — accept if you can co-present with a colleague to share the workload',
              effects: { occupational: 5, social: 4, intellectual: 3 },
              miniActivity: null,
              followUp: 'Collaboration makes the project exciting rather than overwhelming. Your colleague is thrilled to be included.'
            },
            {
              text: 'Decline graciously — your plate is full and you need to protect your capacity',
              effects: { emotional: 4, physical: 2, occupational: -3 },
              miniActivity: null,
              followUp: 'Setting boundaries is a form of self-care. Though a small part of you wonders "what if?"'
            }
          ]
        },
        {
          time: 'evening', id: 'd5_evening',
          narrative: 'It\'s Friday evening! Your partner/friends want to go out for dinner. You\'re also thinking about meal-prepping for the week to save money and eat healthier.',
          choices: [
            {
              text: 'Go out and enjoy! You worked hard this week and deserve a treat',
              effects: { social: 6, emotional: 5, physical: -2, financial: -5 },
              miniActivity: null,
              followUp: 'A wonderful dinner with great conversation. The bill makes you wince but the memories are worth it.'
            },
            {
              text: 'Host a potluck instead — everyone brings a dish, save money and still socialize',
              effects: { social: 5, financial: 4, environmental: 3, physical: 2, emotional: 4 },
              miniActivity: null,
              followUp: 'The potluck is a hit! Great food, warm company, and your wallet barely notices. Why don\'t you do this more often?'
            },
            {
              text: 'Meal prep tonight and plan a social outing for tomorrow instead',
              effects: { physical: 5, financial: 5, occupational: 2, social: -3 },
              miniActivity: null,
              followUp: 'You prep five healthy lunches and feel incredibly organized. But the quiet kitchen feels a little lonely tonight.'
            }
          ]
        }
      ]
    },

    // ═══ DAY 6: Community Engagement ═══
    {
      dayNum: 6, theme: 'Community Engagement',
      narrative: 'Saturday brings time for community, hobbies, and personal enrichment.',
      slots: [
        {
          time: 'morning', id: 'd6_morning',
          narrative: 'Saturday morning. The community garden near campus needs volunteers. There\'s also a continuing education class you\'ve been eyeing. Or you could just sleep in.',
          choices: [
            {
              text: 'Volunteer at the community garden — hands in the dirt, sun on your face',
              effects: { environmental: 8, physical: 5, social: 4, spiritual: 3 },
              miniActivity: null,
              followUp: 'There\'s something profoundly grounding about gardening. You plant herbs, chat with neighbors, and feel connected to the earth.'
            },
            {
              text: 'Take the continuing education class — never stop learning',
              effects: { intellectual: 8, occupational: 4, social: 3 },
              miniActivity: null,
              followUp: 'The class on data visualization opens your eyes to new possibilities. You\'re already thinking about how to apply these skills.'
            },
            {
              text: 'Sleep in and have a slow, lazy morning — restore your energy reserves',
              effects: { physical: 5, emotional: 4, social: -2 },
              miniActivity: null,
              followUp: 'Sleeping until 10 AM and having coffee while watching the birds feels decadent and wonderful.'
            }
          ]
        },
        {
          time: 'afternoon', id: 'd6_afternoon',
          narrative: 'A campus fundraiser gala is tonight and tickets are $75. Your neighbor also invited you to a casual backyard barbecue.',
          choices: [
            {
              text: 'Attend the gala — support the campus and enjoy a formal evening out',
              effects: { social: 5, occupational: 4, spiritual: 3, financial: -6 },
              miniActivity: null,
              followUp: 'The gala is elegant and inspiring. You connect with campus leaders you rarely see and feel proud of your institution.'
            },
            {
              text: 'Go to the barbecue — low-key socializing is more your speed',
              effects: { social: 7, emotional: 5, financial: 2, environmental: 2 },
              miniActivity: null,
              followUp: 'Cold drinks, grilled food, and genuine laughter with neighbors. This is what community is really about.'
            },
            {
              text: 'Use the afternoon for a hobby you\'ve been neglecting — painting, music, woodworking',
              effects: { intellectual: 5, emotional: 6, spiritual: 5, social: -3 },
              miniActivity: null,
              followUp: 'Hours fly by as you lose yourself in creative expression. You produce something you\'re genuinely proud of.'
            }
          ]
        },
        {
          time: 'evening', id: 'd6_evening',
          narrative: 'Evening settles in. You could review your finances for the month, call a friend you haven\'t spoken to in months, or practice mindfulness.',
          choices: [
            {
              text: 'Review your monthly finances and set goals for next month',
              effects: { financial: 7, intellectual: 2, occupational: 2 },
              miniActivity: 'budgetBalancer',
              followUp: 'Numbers don\'t lie. You spot spending patterns and set realistic savings goals. Financial clarity brings peace of mind.'
            },
            {
              text: 'Call that friend — relationships need maintenance just like everything else',
              effects: { social: 7, emotional: 6, spiritual: 3 },
              miniActivity: null,
              followUp: 'Two hours on the phone flies by. You laugh until your sides hurt and hang up feeling reconnected to your past and yourself.'
            },
            {
              text: 'Guided meditation and an early bedtime — invest in your inner peace',
              effects: { spiritual: 7, emotional: 5, physical: 4 },
              miniActivity: 'breathingBubble',
              followUp: 'Twenty minutes of guided meditation and you feel like you\'ve had a full vacation. You drift off to sleep with a smile.'
            }
          ]
        }
      ]
    },

    // ═══ DAY 7: Week Wrap-up & Self-Care ═══
    {
      dayNum: 7, theme: 'Week Wrap-up & Self-Care',
      narrative: 'Sunday — time to reflect, recharge, and prepare for the week ahead.',
      slots: [
        {
          time: 'morning', id: 'd7_morning',
          narrative: 'Sunday morning. You wake up and think about the week ahead. There\'s a community worship/meditation group, a nature trail nearby, or you could organize your home.',
          choices: [
            {
              text: 'Attend the worship service or meditation group — feed your spirit',
              effects: { spiritual: 8, social: 4, emotional: 5 },
              miniActivity: null,
              followUp: 'Singing hymns, silent meditation, or communal prayer — whatever your practice, it fills your cup. You feel centered.'
            },
            {
              text: 'Hike the nature trail — combine exercise with nature immersion',
              effects: { physical: 7, environmental: 5, emotional: 4, spiritual: 3 },
              miniActivity: 'stepChallenge',
              followUp: 'Bird songs, rustling leaves, and the rhythm of your footsteps create a moving meditation. Nature is the ultimate healer.'
            },
            {
              text: 'Deep clean and organize your home — a tidy space creates a tidy mind',
              effects: { environmental: 7, emotional: 4, physical: 3 },
              miniActivity: 'deskOrganizer',
              followUp: 'Three hours of focused cleaning and organizing later, your space feels transformed. You light a candle and admire your work.'
            }
          ]
        },
        {
          time: 'afternoon', id: 'd7_afternoon',
          narrative: 'Time to plan the coming work week. You need to review your calendar, prepare for a big Monday meeting, and think about your professional goals.',
          choices: [
            {
              text: 'Do a comprehensive weekly preview — calendar, goals, meal plan, and self-care blocks',
              effects: { occupational: 6, financial: 3, emotional: 3, intellectual: 3 },
              miniActivity: null,
              followUp: 'Your planner looks amazing with color-coded blocks for work, wellness, and personal time. You feel in control.'
            },
            {
              text: 'Focus on the Monday meeting prep — make sure you\'re ready for the big one',
              effects: { occupational: 7, intellectual: 5, emotional: -2 },
              miniActivity: null,
              followUp: 'Your presentation is polished and you\'ve anticipated all potential questions. Monday will be a win.'
            },
            {
              text: 'Set three simple intentions for the week and trust the rest will flow',
              effects: { spiritual: 5, emotional: 5, occupational: 2 },
              miniActivity: 'gratitudeGarden',
              followUp: 'Your intentions: be present in every meeting, move your body daily, reach out to one person. Simple but powerful.'
            }
          ]
        },
        {
          time: 'evening', id: 'd7_evening',
          narrative: 'Sunday evening. The week ahead awaits. How do you prepare yourself mentally and emotionally?',
          choices: [
            {
              text: 'Prepare everything the night before — clothes, lunch, bag — then a calming bedtime routine',
              effects: { environmental: 5, occupational: 4, emotional: 4, physical: 3 },
              miniActivity: null,
              followUp: 'Everything laid out, alarm set, lavender on the pillow. You slip into bed feeling prepared and peaceful.'
            },
            {
              text: 'Spend quality time with your family/loved ones — play games, share stories, connect',
              effects: { social: 7, emotional: 6, spiritual: 4 },
              miniActivity: 'memoryMatch',
              followUp: 'Game night fills the house with laughter. You\'re reminded that work is important, but this — this is what it\'s all for.'
            },
            {
              text: 'Do something purely for yourself — read a novel, take a bath, listen to music',
              effects: { emotional: 6, spiritual: 5, intellectual: 3 },
              miniActivity: null,
              followUp: 'A hot bath with a good book. Pure self-indulgence. You deserve this, and you\'re starting to believe it.'
            }
          ]
        }
      ]
    }
  ],

  // ═══ RANDOM EVENTS ═══
  randomEvents: [
    {
      id: 'urgent_email',
      text: 'You receive an urgent email from your supervisor at 8 AM: an important client/stakeholder meeting has been moved to today. You have 2 hours to prepare.',
      choices: [
        { text: 'Rise to the challenge — clear your schedule and prepare a solid presentation', effects: { occupational: 6, intellectual: 4, emotional: -2, physical: -2 } },
        { text: 'Ask a colleague to co-lead and divide the prep work', effects: { occupational: 4, social: 4, emotional: 2 } },
        { text: 'Push back and suggest rescheduling — last-minute meetings aren\'t productive', effects: { emotional: 4, occupational: -3 } }
      ],
      triggerCondition: gs => gs.day >= 2 && gs.timeSlot === 0
    },
    {
      id: 'free_workshop',
      text: 'A renowned speaker is giving a free lunchtime talk on campus about work-life balance. Your team lunch was already planned.',
      choices: [
        { text: 'Attend the talk — you can eat lunch at your desk later', effects: { intellectual: 5, spiritual: 4, emotional: 3, social: -2 } },
        { text: 'Stick with the team lunch — relationships are part of work-life balance too', effects: { social: 5, emotional: 3 } }
      ],
      triggerCondition: gs => gs.day >= 2
    },
    {
      id: 'budget_cut',
      text: 'You receive an email: your department budget has been cut by 15%. Some planned professional development opportunities may be affected.',
      choices: [
        { text: 'Advocate to leadership for maintaining PD funding', effects: { occupational: 5, emotional: 3, social: 3 } },
        { text: 'Accept it and find free online alternatives', effects: { intellectual: 4, financial: 3, emotional: -2 } },
        { text: 'Organize a peer learning group to share skills internally', effects: { social: 6, intellectual: 4, occupational: 3 } }
      ],
      triggerCondition: gs => gs.day >= 3
    },
    {
      id: 'recognition',
      text: 'Your supervisor publicly recognizes your work in a team meeting! How do you respond?',
      choices: [
        { text: 'Accept gracefully and acknowledge the team\'s contributions too', effects: { emotional: 6, social: 5, occupational: 4, spiritual: 2 } },
        { text: 'Deflect — "It was really a team effort, not just me"', effects: { social: 3, emotional: -1 } }
      ],
      triggerCondition: gs => gs.day >= 2
    },
    {
      id: 'conflict_resolution',
      text: 'Two team members have a heated disagreement during a meeting. As a senior staff member, others look to you.',
      choices: [
        { text: 'Step in calmly, acknowledge both perspectives, and guide toward resolution', effects: { social: 6, emotional: 4, occupational: 4, spiritual: 2 } },
        { text: 'Suggest a 10-minute break and speak with each person privately', effects: { social: 4, emotional: 3, occupational: 3 } },
        { text: 'Stay out of it — it\'s not your conflict to resolve', effects: { emotional: -3, social: -4 } }
      ],
      triggerCondition: gs => gs.day >= 2
    },
    {
      id: 'parking_issue',
      text: 'Your usual parking spot is taken and the only available one is a 15-minute walk from your building. You\'re running late.',
      choices: [
        { text: 'Park far away and use the walk as bonus exercise', effects: { physical: 4, emotional: 3, environmental: 2 } },
        { text: 'Circle the lot looking for a closer spot — time is money', effects: { emotional: -3, environmental: -2 } }
      ],
      triggerCondition: gs => gs.timeSlot === 0
    },
    {
      id: 'policy_change',
      text: 'Administration announces a new hybrid work policy. You can now work from home 2 days a week starting next month.',
      choices: [
        { text: 'Embrace it! Plan which days work best for deep focus work at home', effects: { occupational: 5, emotional: 4, environmental: 3, physical: 2 } },
        { text: 'You prefer being on campus — the social connection matters more', effects: { social: 4, emotional: 2 } }
      ],
      triggerCondition: gs => gs.day >= 3
    },
    {
      id: 'tech_failure',
      text: 'The campus network goes down during a critical online presentation to stakeholders. Everyone looks at you.',
      choices: [
        { text: 'Stay calm, switch to your phone hotspot, and pivot to a whiteboard backup plan', effects: { emotional: 4, intellectual: 5, occupational: 4 } },
        { text: 'Get flustered and suggest rescheduling the meeting', effects: { emotional: -4, occupational: -3 } }
      ],
      triggerCondition: gs => gs.day >= 2
    },
    {
      id: 'surprise_birthday',
      text: 'Your team organized a surprise birthday celebration for you! There\'s cake, cards, and heartfelt messages.',
      choices: [
        { text: 'Be fully present and express genuine gratitude to everyone', effects: { emotional: 8, social: 7, spiritual: 3 } },
        { text: 'Thank them quickly and get back to work — you\'re behind on deadlines', effects: { occupational: 2, emotional: -2, social: -4 } }
      ],
      triggerCondition: gs => true
    },
    {
      id: 'retirement_seminar',
      text: 'A financial advisor is offering free 30-minute retirement planning sessions on campus this week.',
      choices: [
        { text: 'Sign up! You haven\'t reviewed your retirement strategy in years', effects: { financial: 7, intellectual: 3, emotional: 2 } },
        { text: 'You\'ll do it yourself online — no need for an advisor', effects: { financial: 2, intellectual: 1 } },
        { text: 'You\'re too busy this week — maybe next time', effects: { financial: -2 } }
      ],
      triggerCondition: gs => gs.day >= 3
    },
    {
      id: 'volunteer_request',
      text: 'A local nonprofit asks if your department could volunteer for a Saturday event. It would mean giving up personal time.',
      choices: [
        { text: 'Organize a team volunteer day — great for team building and community', effects: { social: 5, spiritual: 5, occupational: 3, physical: -2 } },
        { text: 'Politely decline — your weekends are for recharging', effects: { emotional: 3, physical: 2, social: -2 } }
      ],
      triggerCondition: gs => gs.day >= 4
    },
    {
      id: 'vending_machine',
      text: 'It\'s 3 PM and your energy is crashing. The vending machine calls to you, but there\'s also fruit in the break room.',
      choices: [
        { text: 'Grab an apple and take a 5-minute walk outside instead', effects: { physical: 4, emotional: 3, environmental: 2, financial: 1 } },
        { text: 'Give in to the candy bar — sometimes you just need chocolate', effects: { emotional: 2, physical: -3, financial: -1 } }
      ],
      triggerCondition: gs => gs.timeSlot === 1
    },
    {
      id: 'student_thank_you',
      text: 'A former student/mentee sends you a heartfelt email about how you changed their life. You haven\'t heard from them in years.',
      choices: [
        { text: 'Write a thoughtful response and share how hearing this made your day', effects: { emotional: 7, spiritual: 6, social: 4 } },
        { text: 'Send a quick "Thank you!" and file it in your gratitude folder', effects: { emotional: 4, spiritual: 2 } }
      ],
      triggerCondition: gs => true
    },
    {
      id: 'overtime_request',
      text: 'Your supervisor asks if you can work late tonight to help with an urgent project. You had plans to exercise.',
      choices: [
        { text: 'Stay late — being a team player is important', effects: { occupational: 5, social: 3, physical: -5, emotional: -3 } },
        { text: 'Offer a compromise — work an extra hour but not the whole evening', effects: { occupational: 3, physical: -2, emotional: 2 } },
        { text: 'Politely decline — you have a commitment and your health matters', effects: { physical: 4, emotional: 4, occupational: -4 } }
      ],
      triggerCondition: gs => gs.timeSlot === 1
    },
    {
      id: 'sunny_campus',
      text: 'It\'s a gorgeous day and campus is buzzing with energy. You spot an empty bench under a flowering tree during your break.',
      choices: [
        { text: 'Sit on the bench for 10 minutes and just... be present', effects: { spiritual: 5, emotional: 5, environmental: 3 } },
        { text: 'Take a walking meeting with your next appointment instead of sitting in the office', effects: { physical: 4, occupational: 3, environmental: 3, social: 2 } }
      ],
      triggerCondition: gs => true
    }
  ]
};
