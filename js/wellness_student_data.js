// ═══════════════════════════════════════════════════════════════
// WELLNESS JOURNEY — Student Edition Data
// 35 scenarios (7 days × 3 + alternates) + 15 random events
// ═══════════════════════════════════════════════════════════════

const WELLNESS_CONFIG = {
  version: 'student',
  title: 'Student Edition',
  subtitle: 'Navigate your college week — balance studies, social life, and self-care',
  reportIntro: 'Here\'s how your first week of the semester went...',

  tips: {
    physical:      { high: 'Great job staying active! Keep those exercise habits going.', low: 'Try walking to class or doing a quick 10-min workout between study sessions.' },
    emotional:     { high: 'You\'re managing stress well! Keep those coping strategies.', low: 'Consider visiting the campus counseling center or starting a simple journaling routine.' },
    social:        { high: 'Your social connections are strong! Keep nurturing friendships.', low: 'Try joining a club or study group — campus is full of people who share your interests.' },
    intellectual:  { high: 'You\'re fueling your curiosity! Keep exploring new ideas.', low: 'Set aside 20 minutes daily for something intellectually stimulating outside coursework.' },
    spiritual:     { high: 'You\'re connected to your sense of purpose!', low: 'Try a guided meditation app or spend time reflecting on what matters most to you.' },
    occupational:  { high: 'You\'re on track academically and career-wise!', low: 'Visit the career center or set small weekly academic goals to build momentum.' },
    financial:     { high: 'Smart money management! Keep budgeting and saving.', low: 'Track your spending for a week — small changes can make a big difference.' },
    environmental: { high: 'You\'re creating great spaces for yourself!', low: 'A clean, organized space boosts focus. Try the 5-minute tidy-up habit.' }
  },

  extraAchievements: [
    { id: 'deans_list', name: 'Dean\'s List', desc: 'Intellectual and Occupational both above 85', icon: '🎓',
      check: gs => gs.wellness.intellectual >= 85 && gs.wellness.occupational >= 85 },
    { id: 'campus_life', name: 'Campus Life', desc: 'Social and Environmental both above 80', icon: '🏫',
      check: gs => gs.wellness.social >= 80 && gs.wellness.environmental >= 80 }
  ],

  days: [
    // ═══ DAY 1: First Day of Semester ═══
    {
      dayNum: 1, theme: 'First Day of Semester',
      narrative: 'A fresh start awaits you on the first day of the new semester!',
      slots: [
        {
          time: 'morning', id: 'd1_morning',
          narrative: 'Your alarm goes off at 7 AM. You have an 8:30 class across campus. The weather is crisp and cool. Your roommate is still sleeping.',
          choices: [
            {
              text: 'Get up early, do some stretches, and walk to class enjoying the morning air',
              effects: { physical: 8, emotional: 4, environmental: 3 },
              miniActivity: 'breathingBubble',
              followUp: 'The morning air feels refreshing as you walk past the quad. You arrive feeling energized and ready to learn.'
            },
            {
              text: 'Hit snooze twice and rush to catch the campus shuttle',
              effects: { physical: -3, occupational: 3 },
              miniActivity: null,
              followUp: 'You make it just in time, sliding into your seat as the professor begins. Your heart is still racing from the sprint.'
            },
            {
              text: 'Skip class and sleep in — you\'ll get the notes from someone later',
              effects: { physical: 2, occupational: -8, intellectual: -5, social: -2 },
              miniActivity: null,
              followUp: 'The extra sleep felt good, but guilt creeps in by noon. You realize you don\'t actually know anyone in that class yet.'
            }
          ]
        },
        {
          time: 'afternoon', id: 'd1_afternoon',
          narrative: 'Between classes, you see flyers for dozens of campus clubs and organizations at the student involvement fair. A few friends wave you over.',
          choices: [
            {
              text: 'Spend an hour exploring the fair and sign up for two clubs that interest you',
              effects: { social: 7, intellectual: 4, spiritual: 2 },
              miniActivity: 'socialWeb',
              followUp: 'You sign up for the hiking club and a creative writing group. The people seem welcoming and you already have plans for next week!'
            },
            {
              text: 'Grab a quick lunch and head straight to the library to stay ahead on readings',
              effects: { intellectual: 6, occupational: 5, social: -3 },
              miniActivity: null,
              followUp: 'You get a solid head start on your coursework. The library is peaceful, but you notice other students chatting in groups.'
            },
            {
              text: 'Join your friends for a long lunch at the dining hall and catch up on summer stories',
              effects: { social: 8, emotional: 5, occupational: -3, financial: -2 },
              miniActivity: null,
              followUp: 'Two hours fly by filled with laughter and reconnection. You feel warm and happy, though you realize you missed your study window.'
            }
          ]
        },
        {
          time: 'evening', id: 'd1_evening',
          narrative: 'Back in your dorm, your roommate suggests ordering pizza and watching a movie. You also have a course syllabus to review and your budget is already tight.',
          choices: [
            {
              text: 'Join for the movie but make a budget-friendly meal from the dining hall instead of ordering',
              effects: { social: 5, financial: 4, emotional: 3 },
              miniActivity: null,
              followUp: 'You enjoy the movie together while eating a simple meal. A perfect balance of socializing and being smart with money.'
            },
            {
              text: 'Politely decline, review your syllabi, and plan your week ahead',
              effects: { occupational: 7, intellectual: 4, social: -3, emotional: -2 },
              miniActivity: null,
              followUp: 'You create a detailed weekly planner. It feels productive but a little lonely hearing your roommate laughing at the movie.'
            },
            {
              text: 'Order pizza, watch the movie, and worry about the syllabus tomorrow',
              effects: { social: 6, emotional: 4, financial: -5, occupational: -4 },
              miniActivity: null,
              followUp: 'Great bonding time! But the $15 pizza makes you wince and the unread syllabus nags at the back of your mind.'
            }
          ]
        }
      ]
    },

    // ═══ DAY 2: Study & Social Balance ═══
    {
      dayNum: 2, theme: 'Study & Social Balance',
      narrative: 'Your second day brings the reality of balancing academics and social life.',
      slots: [
        {
          time: 'morning', id: 'd2_morning',
          narrative: 'You wake up to find your roommate left dishes piled in the sink again. You have a study group meeting in an hour and your workspace is cluttered.',
          choices: [
            {
              text: 'Have an honest conversation with your roommate about shared spaces',
              effects: { social: 5, emotional: 5, environmental: 5 },
              miniActivity: null,
              followUp: 'It was awkward at first, but your roommate appreciated the honesty. You agree on a cleaning schedule.'
            },
            {
              text: 'Clean up silently and organize both your spaces before studying',
              effects: { environmental: 8, emotional: -2, physical: 2 },
              miniActivity: 'deskOrganizer',
              followUp: 'The space looks great and you feel more focused, but you feel a bit resentful doing all the work alone.'
            },
            {
              text: 'Ignore the mess and head to the library for your study session',
              effects: { intellectual: 5, occupational: 3, environmental: -5 },
              miniActivity: null,
              followUp: 'Out of sight, out of mind — for now. The study session goes well, but you dread coming back to the mess.'
            }
          ]
        },
        {
          time: 'afternoon', id: 'd2_afternoon',
          narrative: 'Your professor announces a group project due in two weeks. You\'re paired with two students you don\'t know well. One suggests meeting right after class.',
          choices: [
            {
              text: 'Meet now and start planning — first impressions matter in group work',
              effects: { occupational: 6, social: 5, intellectual: 3 },
              miniActivity: null,
              followUp: 'You establish roles and a timeline. Your group members seem reliable and you exchange contact info.'
            },
            {
              text: 'Suggest meeting tomorrow instead — you need to process the assignment first',
              effects: { intellectual: 5, occupational: 2, social: -2 },
              miniActivity: null,
              followUp: 'You spend the afternoon reading the requirements carefully. You\'ll be well-prepared for tomorrow\'s meeting.'
            },
            {
              text: 'Volunteer to create a shared document and divide the work asynchronously',
              effects: { intellectual: 4, occupational: 4, social: -4 },
              miniActivity: null,
              followUp: 'Efficient, but your group members seem a bit disappointed they won\'t get to collaborate in person.'
            }
          ]
        },
        {
          time: 'evening', id: 'd2_evening',
          narrative: 'A friend invites you to an intramural volleyball game. You\'re feeling tired from the day but the fresh air might be nice.',
          choices: [
            {
              text: 'Go play! Exercise and socializing is exactly what you need',
              effects: { physical: 8, social: 6, emotional: 4, intellectual: -2 },
              miniActivity: 'stepChallenge',
              followUp: 'You have a blast diving for balls and high-fiving teammates. Your body is tired but your spirit is lifted!'
            },
            {
              text: 'Watch from the sidelines and cheer — you\'re too tired to play but want to be supportive',
              effects: { social: 4, emotional: 3, physical: -1 },
              miniActivity: null,
              followUp: 'You enjoy the camaraderie without the physical strain. It\'s nice just being around positive energy.'
            },
            {
              text: 'Stay in and do a gentle yoga session in your room instead',
              effects: { physical: 5, emotional: 4, spiritual: 3, social: -3 },
              miniActivity: 'breathingBubble',
              followUp: 'The stretching feels wonderful after a long day. You feel centered and calm, though you wonder what you missed.'
            }
          ]
        }
      ]
    },

    // ═══ DAY 3: Money & Meal Planning ═══
    {
      dayNum: 3, theme: 'Money & Meal Planning',
      narrative: 'Midweek brings financial realities and nutrition decisions to the forefront.',
      slots: [
        {
          time: 'morning', id: 'd3_morning',
          narrative: 'You check your bank account and realize you\'ve spent more than planned this week. Your meal plan only covers weekday lunches. Breakfast is on you.',
          choices: [
            {
              text: 'Make a simple breakfast in the communal kitchen and create a weekly budget',
              effects: { financial: 7, physical: 3, intellectual: 2 },
              miniActivity: 'budgetBalancer',
              followUp: 'Oatmeal and fruit costs almost nothing. You map out your spending and feel more in control.'
            },
            {
              text: 'Grab a coffee and muffin from the campus café — you\'ll budget later',
              effects: { financial: -4, emotional: 2 },
              miniActivity: null,
              followUp: 'The coffee is good but $6.50 for breakfast adds up fast. You make a mental note to budget... eventually.'
            },
            {
              text: 'Skip breakfast entirely to save money and study during the extra time',
              effects: { financial: 3, physical: -6, intellectual: -3, emotional: -2 },
              miniActivity: null,
              followUp: 'By 10 AM your stomach is growling loudly in class. It\'s hard to focus when you\'re hungry.'
            }
          ]
        },
        {
          time: 'afternoon', id: 'd3_afternoon',
          narrative: 'Your campus wellness center is hosting a free nutrition workshop. At the same time, your study group wants to meet at a café off campus.',
          choices: [
            {
              text: 'Attend the nutrition workshop — it\'s free and could help with meal planning',
              effects: { physical: 5, intellectual: 4, financial: 3, spiritual: 2 },
              miniActivity: null,
              followUp: 'You learn about budget-friendly healthy meals and get free recipe cards. This could change your eating habits!'
            },
            {
              text: 'Go to the café with your study group — socializing and studying in one trip',
              effects: { social: 5, intellectual: 3, financial: -4 },
              miniActivity: null,
              followUp: 'Productive study session with good company. The $8 latte was unnecessary though.'
            },
            {
              text: 'Attend the workshop for 30 minutes, then join the study group at the library instead',
              effects: { physical: 3, intellectual: 4, social: 3, financial: 2 },
              miniActivity: null,
              followUp: 'A smart compromise! You pick up nutrition tips and still get quality study time with friends.'
            }
          ]
        },
        {
          time: 'evening', id: 'd3_evening',
          narrative: 'Your floor is doing a communal cooking night. Each person contributes one ingredient. Meanwhile, you have an assignment due tomorrow.',
          choices: [
            {
              text: 'Join the cooking night — community bonding and a home-cooked meal sounds perfect',
              effects: { social: 7, emotional: 5, environmental: 3, financial: 3, occupational: -4 },
              miniActivity: null,
              followUp: 'The shared meal is delicious and you learn your neighbor makes amazing stir-fry. The assignment will have to wait until later tonight.'
            },
            {
              text: 'Contribute an ingredient but excuse yourself to finish your assignment while dinner cooks',
              effects: { social: 3, occupational: 5, financial: 2 },
              miniActivity: null,
              followUp: 'You finish your assignment and still get a plate of food. Multitasking for the win!'
            },
            {
              text: 'Skip it and power through the assignment — you\'ll eat a snack from the vending machine',
              effects: { occupational: 6, intellectual: 3, social: -5, physical: -3, financial: -2 },
              miniActivity: null,
              followUp: 'Assignment done and submitted. But chips and a candy bar for dinner leaves you feeling sluggish and isolated.'
            }
          ]
        }
      ]
    },

    // ═══ DAY 4: Campus Involvement ═══
    {
      dayNum: 4, theme: 'Campus Involvement',
      narrative: 'Thursday brings opportunities to get more involved in campus life.',
      slots: [
        {
          time: 'morning', id: 'd4_morning',
          narrative: 'The environmental club is organizing a campus cleanup this morning. You also promised yourself you\'d go to the gym today.',
          choices: [
            {
              text: 'Join the campus cleanup — helping the environment IS physical activity',
              effects: { environmental: 8, physical: 4, social: 5, spiritual: 3 },
              miniActivity: null,
              followUp: 'You pick up litter for an hour and meet some amazing people who care about the planet. You feel connected and purposeful.'
            },
            {
              text: 'Hit the gym first, then see if the cleanup is still going when you\'re done',
              effects: { physical: 7, environmental: 2, social: 2 },
              miniActivity: 'stepChallenge',
              followUp: 'Great workout! You catch the tail end of the cleanup and help for 20 minutes. Not bad!'
            },
            {
              text: 'Sleep in — you\'ve had a long week and your body needs rest',
              effects: { physical: 3, emotional: 2, social: -3, environmental: -2 },
              miniActivity: null,
              followUp: 'Sometimes rest is exactly what you need. You feel more alert in your afternoon classes.'
            }
          ]
        },
        {
          time: 'afternoon', id: 'd4_afternoon',
          narrative: 'The career center is holding a mock interview workshop. Your friend also wants help studying for their exam tomorrow.',
          choices: [
            {
              text: 'Attend the mock interview workshop — investing in your future career',
              effects: { occupational: 7, intellectual: 3, emotional: 3 },
              miniActivity: null,
              followUp: 'You get practical feedback on your interview skills. The advisor also reviews your resume and gives great tips.'
            },
            {
              text: 'Help your friend study — teaching others reinforces your own learning',
              effects: { social: 6, intellectual: 5, emotional: 3 },
              miniActivity: null,
              followUp: 'Explaining concepts to your friend actually helps you understand them better too. Win-win!'
            },
            {
              text: 'Do both! Pop into the workshop for the first half, then help your friend',
              effects: { occupational: 4, social: 4, intellectual: 3, physical: -2 },
              miniActivity: null,
              followUp: 'A packed afternoon, but you managed to invest in both your career and friendship. You\'re a little tired though.'
            }
          ]
        },
        {
          time: 'evening', id: 'd4_evening',
          narrative: 'There\'s a meditation and mindfulness session at the campus chapel tonight. Your roommate wants to binge-watch a new show instead.',
          choices: [
            {
              text: 'Try the meditation session — you\'ve been meaning to explore mindfulness',
              effects: { spiritual: 8, emotional: 6, physical: 2 },
              miniActivity: 'breathingBubble',
              followUp: 'The guided meditation leaves you feeling peaceful and grounded. You discover a new tool for managing stress.'
            },
            {
              text: 'Watch the show with your roommate — sometimes you just need to relax',
              effects: { social: 4, emotional: 3, intellectual: -2 },
              miniActivity: null,
              followUp: 'Cozy evening in! The show is actually pretty good and your roommate bonding time is valuable.'
            },
            {
              text: 'Do a quick journal reflection in your room before joining your roommate for one episode',
              effects: { spiritual: 4, emotional: 4, social: 3 },
              miniActivity: 'gratitudeGarden',
              followUp: 'Writing down your thoughts helps process the week. Then you enjoy one episode guilt-free before bed.'
            }
          ]
        }
      ]
    },

    // ═══ DAY 5: Midweek Stress ═══
    {
      dayNum: 5, theme: 'Midweek Stress',
      narrative: 'Friday hits and the week\'s accumulated stress starts to show.',
      slots: [
        {
          time: 'morning', id: 'd5_morning',
          narrative: 'You wake up anxious about a quiz today. You stayed up too late and only got 5 hours of sleep. Your head is foggy.',
          choices: [
            {
              text: 'Take a cold shower to wake up and do a quick review of key concepts',
              effects: { physical: 3, intellectual: 4, occupational: 3, emotional: -2 },
              miniActivity: null,
              followUp: 'The shock of cold water jolts you awake. Your quick review hits the main points and you feel slightly more prepared.'
            },
            {
              text: 'Skip your morning routine and cram until the last minute',
              effects: { intellectual: 3, occupational: 2, physical: -5, emotional: -4 },
              miniActivity: null,
              followUp: 'You squeeze in a few more facts but arrive at class stressed, unwashed, and running on fumes.'
            },
            {
              text: 'Accept that you\'re not fully prepared — eat breakfast, move slowly, trust what you already know',
              effects: { emotional: 6, physical: 4, spiritual: 3, occupational: -2 },
              miniActivity: null,
              followUp: 'A calm morning helps you think more clearly. You recall more than expected on the quiz. Self-compassion works.'
            }
          ]
        },
        {
          time: 'afternoon', id: 'd5_afternoon',
          narrative: 'After your quiz, a friend suggests going to the campus recreation center. You also have a paper outline due Monday and need to start.',
          choices: [
            {
              text: 'Hit the rec center — physical activity will help clear your post-quiz brain',
              effects: { physical: 7, emotional: 5, social: 4, occupational: -3 },
              miniActivity: 'stepChallenge',
              followUp: 'Swimming and shooting hoops melts away the quiz stress. You feel refreshed and actually more creative afterward.'
            },
            {
              text: 'Start on the paper outline while your intellectual momentum is up',
              effects: { occupational: 6, intellectual: 5, emotional: -2 },
              miniActivity: null,
              followUp: 'You make solid progress on the outline. It feels good to be proactive about the next deadline.'
            },
            {
              text: 'Take a restorative nap first, then work on the paper for an hour',
              effects: { physical: 4, emotional: 3, occupational: 3 },
              miniActivity: null,
              followUp: 'The 45-minute nap does wonders for your brain. You write a focused outline that you\'re actually proud of.'
            }
          ]
        },
        {
          time: 'evening', id: 'd5_evening',
          narrative: 'It\'s Friday night! There\'s a campus movie screening, a house party off campus, or you could have a quiet night in.',
          choices: [
            {
              text: 'Go to the campus movie screening — free entertainment and a social atmosphere',
              effects: { social: 5, emotional: 4, financial: 3, intellectual: 2 },
              miniActivity: null,
              followUp: 'The film sparks great conversations afterward. A low-key but meaningful Friday night.'
            },
            {
              text: 'Head to the house party — it\'s college, time to let loose!',
              effects: { social: 7, emotional: 3, physical: -4, financial: -5, occupational: -2 },
              miniActivity: null,
              followUp: 'You have a wild time but spend too much on the ride there and back. Your Saturday morning self will have regrets.'
            },
            {
              text: 'Quiet night in with a good book, some tea, and an early bedtime',
              effects: { spiritual: 5, emotional: 5, physical: 4, intellectual: 3, social: -4 },
              miniActivity: 'gratitudeGarden',
              followUp: 'A beautifully peaceful evening. You feel genuinely recharged and at peace with yourself.'
            }
          ]
        }
      ]
    },

    // ═══ DAY 6: Community & Environment ═══
    {
      dayNum: 6, theme: 'Community & Environment',
      narrative: 'Saturday opens up time for community engagement and personal spaces.',
      slots: [
        {
          time: 'morning', id: 'd6_morning',
          narrative: 'You wake up on Saturday with no obligations. Your room is a disaster from the busy week. There\'s also a farmer\'s market near campus.',
          choices: [
            {
              text: 'Do a deep clean of your room — put on music and make it a fun activity',
              effects: { environmental: 8, emotional: 4, physical: 3 },
              miniActivity: 'deskOrganizer',
              followUp: 'Two hours later, your room is sparkling. You light a candle and feel like you\'re living in a completely different space.'
            },
            {
              text: 'Visit the farmer\'s market — fresh produce and community vibes',
              effects: { environmental: 4, social: 4, physical: 3, financial: -3 },
              miniActivity: null,
              followUp: 'You buy fresh apples and local honey. The market atmosphere is lively and you chat with friendly vendors.'
            },
            {
              text: 'Sleep in until noon — your body and mind need recovery time',
              effects: { physical: 5, emotional: 3, environmental: -3, social: -2 },
              miniActivity: null,
              followUp: 'Glorious sleep. You wake up feeling restored, even if your room is still a mess.'
            }
          ]
        },
        {
          time: 'afternoon', id: 'd6_afternoon',
          narrative: 'A student organization is hosting a community service event at a local food bank. Your friend also invited you to go shopping at the mall.',
          choices: [
            {
              text: 'Volunteer at the food bank — giving back to the community feels right',
              effects: { spiritual: 7, social: 5, emotional: 4, physical: 2 },
              miniActivity: null,
              followUp: 'Sorting donations alongside other volunteers is surprisingly fun. You leave feeling connected to something bigger than yourself.'
            },
            {
              text: 'Go shopping — you need some new clothes and quality friend time',
              effects: { social: 5, emotional: 3, financial: -7 },
              miniActivity: null,
              followUp: 'You find some great deals and have fun trying on outfits. But the credit card bill will be a reality check.'
            },
            {
              text: 'Do an hour at the food bank, then meet your friend for window shopping only',
              effects: { spiritual: 4, social: 4, emotional: 3, financial: 1 },
              miniActivity: null,
              followUp: 'Best of both worlds! You contribute to the community and enjoy friend time without overspending.'
            }
          ]
        },
        {
          time: 'evening', id: 'd6_evening',
          narrative: 'Your floor is having a game night in the common room. You also got a call from a family member who wants to catch up.',
          choices: [
            {
              text: 'Call your family member first, then join game night',
              effects: { social: 6, emotional: 6, spiritual: 3 },
              miniActivity: null,
              followUp: 'Hearing your family\'s voice grounds you. Then game night brings the laughter. A beautifully balanced evening.'
            },
            {
              text: 'Join game night fully — you\'ll call family tomorrow',
              effects: { social: 7, emotional: 3, spiritual: -2 },
              miniActivity: 'memoryMatch',
              followUp: 'Card games and board games create hilarious memories. You feel closer to your floormates than ever.'
            },
            {
              text: 'Have a long call with family and skip game night',
              effects: { emotional: 6, spiritual: 5, social: -3 },
              miniActivity: null,
              followUp: 'An hour-long call fills your heart. You hear about home and share your college adventures. Family connection is powerful.'
            }
          ]
        }
      ]
    },

    // ═══ DAY 7: Reflection & Planning ═══
    {
      dayNum: 7, theme: 'Reflection & Planning',
      narrative: 'Sunday — time to reflect on the week and prepare for what\'s ahead.',
      slots: [
        {
          time: 'morning', id: 'd7_morning',
          narrative: 'It\'s Sunday morning. You feel a mix of accomplishment and anxiety about the week ahead. The campus chapel has a service, and there\'s also a yoga class.',
          choices: [
            {
              text: 'Attend the chapel service or spiritual gathering — feed your soul',
              effects: { spiritual: 8, emotional: 5, social: 3 },
              miniActivity: null,
              followUp: 'The quiet reflection and sense of community fills you with peace. You feel more centered about the week ahead.'
            },
            {
              text: 'Go to the morning yoga class — connect mind and body',
              effects: { physical: 6, spiritual: 5, emotional: 4 },
              miniActivity: 'breathingBubble',
              followUp: 'Sun salutations and deep breathing leave you feeling both strong and serene. A perfect Sunday morning.'
            },
            {
              text: 'Make a nice breakfast and journal about your week\'s experiences',
              effects: { emotional: 6, spiritual: 4, intellectual: 3, physical: 2 },
              miniActivity: 'gratitudeGarden',
              followUp: 'Writing helps you process everything that happened. You find clarity in putting your thoughts on paper.'
            }
          ]
        },
        {
          time: 'afternoon', id: 'd7_afternoon',
          narrative: 'Time to plan the coming week. You need to review finances, prep for classes, and decide on extracurricular commitments.',
          choices: [
            {
              text: 'Create a comprehensive weekly plan — schedule, budget, goals, and self-care time',
              effects: { occupational: 6, financial: 5, intellectual: 3, emotional: 3 },
              miniActivity: 'budgetBalancer',
              followUp: 'Your color-coded planner is a work of art. You\'ve allocated time for studying, socializing, exercise, AND rest.'
            },
            {
              text: 'Focus on academics only — get ahead on readings and start that paper',
              effects: { intellectual: 7, occupational: 6, emotional: -2, social: -2 },
              miniActivity: null,
              followUp: 'You make great academic progress but realize you haven\'t planned anything fun or social for next week.'
            },
            {
              text: 'Take a more intuitive approach — set 3 big intentions and stay flexible',
              effects: { spiritual: 4, emotional: 4, occupational: 2 },
              miniActivity: null,
              followUp: 'Your three intentions: be present, move your body daily, connect with one new person. Simple but powerful.'
            }
          ]
        },
        {
          time: 'evening', id: 'd7_evening',
          narrative: 'Sunday evening winds down. You want to start the new week feeling prepared and positive. How do you spend your last evening?',
          choices: [
            {
              text: 'Prep your bag, lay out clothes, set up a calming bedtime routine',
              effects: { environmental: 5, physical: 4, emotional: 4, occupational: 3 },
              miniActivity: null,
              followUp: 'Everything is ready for tomorrow. You slip into bed feeling organized, calm, and genuinely excited about the week ahead.'
            },
            {
              text: 'Have a meaningful conversation with your roommate about your goals and dreams',
              effects: { social: 6, emotional: 5, spiritual: 4 },
              miniActivity: null,
              followUp: 'You and your roommate share dreams and fears about the future. The vulnerability deepens your friendship.'
            },
            {
              text: 'Do something creative — draw, write, play music, or build something',
              effects: { intellectual: 5, emotional: 5, spiritual: 4 },
              miniActivity: null,
              followUp: 'Expressing yourself creatively is the perfect way to end the week. You feel alive and inspired.'
            }
          ]
        }
      ]
    }
  ],

  // ═══ RANDOM EVENTS ═══
  randomEvents: [
    {
      id: 'surprise_quiz',
      text: 'Surprise! Your professor announces a pop quiz worth 5% of your grade. You either studied last night... or you didn\'t.',
      choices: [
        { text: 'Stay calm and trust your preparation — you\'ve got this', effects: { emotional: 5, intellectual: 4, occupational: 3 } },
        { text: 'Panic and try to quickly cram during the instructions', effects: { emotional: -5, intellectual: 1, occupational: -2 } }
      ],
      triggerCondition: gs => gs.day >= 2
    },
    {
      id: 'free_concert',
      text: 'Your favorite artist is doing a surprise free show on campus tonight! But you have an early morning tomorrow.',
      choices: [
        { text: 'Go to the concert — experiences like this are once in a lifetime!', effects: { emotional: 8, social: 6, physical: -4, occupational: -3 } },
        { text: 'Watch the livestream from your room — best of both worlds', effects: { emotional: 4, social: -2, physical: 2 } },
        { text: 'Skip it and get a full night\'s sleep', effects: { physical: 4, occupational: 2, emotional: -3, social: -3 } }
      ],
      triggerCondition: gs => gs.day >= 3 && gs.timeSlot === 2
    },
    {
      id: 'friend_crisis',
      text: 'A close friend calls you in tears — they\'re having a really tough day and need someone to talk to right now.',
      choices: [
        { text: 'Drop everything and go be there for them', effects: { social: 8, emotional: 4, spiritual: 3, occupational: -4 } },
        { text: 'Listen on the phone for 20 minutes and suggest they visit the counseling center', effects: { social: 5, emotional: 3, spiritual: 2 } }
      ],
      triggerCondition: gs => gs.day >= 2
    },
    {
      id: 'scholarship_email',
      text: 'You receive an email about a scholarship opportunity! The application requires a 500-word essay due in 3 days.',
      choices: [
        { text: 'Start drafting the essay immediately — this could change your finances', effects: { financial: 6, occupational: 5, intellectual: 3, emotional: -2 } },
        { text: 'Bookmark it and plan to work on it this weekend', effects: { financial: 2, occupational: 2, emotional: 1 } },
        { text: 'It sounds like too much work on top of everything else — pass', effects: { emotional: 2, financial: -3, occupational: -2 } }
      ],
      triggerCondition: gs => gs.day >= 3
    },
    {
      id: 'roommate_conflict',
      text: 'Your roommate played loud music until 2 AM last night. You\'re exhausted and frustrated.',
      choices: [
        { text: 'Address it calmly — explain how it affected your sleep and suggest quiet hours', effects: { social: 4, emotional: 4, environmental: 4, physical: -2 } },
        { text: 'Put in earplugs and move on — it\'s not worth the conflict', effects: { emotional: -3, physical: -2, environmental: -3 } },
        { text: 'Report it to your RA — sometimes you need an authority figure to mediate', effects: { environmental: 5, emotional: 2, social: -4 } }
      ],
      triggerCondition: gs => gs.day >= 2
    },
    {
      id: 'lost_wallet',
      text: 'You realize you can\'t find your student ID and wallet. You last had them at the dining hall yesterday.',
      choices: [
        { text: 'Retrace your steps calmly and check the lost and found', effects: { emotional: 3, financial: 2, intellectual: 2 } },
        { text: 'Panic and cancel your debit card immediately', effects: { financial: -3, emotional: -5 } }
      ],
      triggerCondition: gs => gs.day >= 2
    },
    {
      id: 'sunny_day',
      text: 'It\'s an unexpectedly gorgeous day — 75°F and sunny. Everyone seems to be outside.',
      choices: [
        { text: 'Take your studying outside — blanket on the quad', effects: { environmental: 5, emotional: 4, physical: 3, intellectual: 2 } },
        { text: 'Put down the books and just enjoy the day with friends', effects: { social: 5, emotional: 6, physical: 3, occupational: -3 } },
        { text: 'Stay inside and stay focused — weather is a distraction', effects: { occupational: 3, intellectual: 2, emotional: -3, environmental: -2 } }
      ],
      triggerCondition: gs => true
    },
    {
      id: 'club_leadership',
      text: 'The club you joined last week needs a new treasurer. The current one is stepping down and they think you\'d be great.',
      choices: [
        { text: 'Accept! It\'s a great resume builder and leadership experience', effects: { occupational: 6, social: 4, financial: 3, emotional: -2 } },
        { text: 'Politely decline — you\'re still getting settled this semester', effects: { emotional: 3, occupational: -1 } }
      ],
      triggerCondition: gs => gs.day >= 4
    },
    {
      id: 'care_package',
      text: 'You receive a surprise care package from home! Homemade cookies, a handwritten letter, and a gift card.',
      choices: [
        { text: 'Share the cookies with your floormates and call home to say thanks', effects: { social: 5, emotional: 7, spiritual: 4, financial: 3 } },
        { text: 'Savor the package alone in your room — a private moment of comfort', effects: { emotional: 6, spiritual: 3 } }
      ],
      triggerCondition: gs => true
    },
    {
      id: 'computer_crash',
      text: 'Your laptop freezes and you lose an hour of unsaved work on your assignment. Technology strikes again.',
      choices: [
        { text: 'Take a deep breath, save what you can, and start rewriting — you\'ve got this', effects: { emotional: 3, intellectual: 2, occupational: 2 } },
        { text: 'Get frustrated and complain to everyone around you', effects: { emotional: -4, social: -2, occupational: -2 } },
        { text: 'Visit the campus tech support to prevent this from happening again', effects: { intellectual: 3, occupational: 3, emotional: 1 } }
      ],
      triggerCondition: gs => gs.day >= 2
    },
    {
      id: 'free_food',
      text: 'There\'s a departmental event with free pizza! But it requires sitting through a 30-minute info session about a minor you\'re not interested in.',
      choices: [
        { text: 'Go for the free food — and who knows, you might learn something', effects: { financial: 3, intellectual: 2, physical: 1 } },
        { text: 'Skip it — your time is more valuable than free pizza', effects: { occupational: 2, emotional: 1 } }
      ],
      triggerCondition: gs => true
    },
    {
      id: 'fitness_challenge',
      text: 'Your dorm is running a 7-day step challenge. The winning floor gets a pizza party.',
      choices: [
        { text: 'Sign up and commit to walking more this week', effects: { physical: 5, social: 4, emotional: 3 } },
        { text: 'You\'ll participate casually but won\'t change your routine', effects: { physical: 1, social: 2 } }
      ],
      triggerCondition: gs => gs.day <= 3
    },
    {
      id: 'awkward_encounter',
      text: 'You run into someone you had an awkward interaction with last semester. They smile and wave.',
      choices: [
        { text: 'Wave back and start a friendly conversation — clear the air', effects: { social: 5, emotional: 4, spiritual: 2 } },
        { text: 'Give a polite nod and keep walking', effects: { emotional: -1, social: -1 } }
      ],
      triggerCondition: gs => gs.day >= 2
    },
    {
      id: 'rain_storm',
      text: 'A sudden rainstorm hits and you forgot your umbrella. Your next class is a 10-minute walk away.',
      choices: [
        { text: 'Run through the rain! Embrace the spontaneity', effects: { emotional: 4, physical: 2, environmental: 2 } },
        { text: 'Wait it out under a building overhang — better late than wet', effects: { occupational: -2, emotional: 1 } },
        { text: 'Ask a classmate to share their umbrella — make a new connection', effects: { social: 5, emotional: 3 } }
      ],
      triggerCondition: gs => true
    },
    {
      id: 'prof_office_hours',
      text: 'Your professor mentions they have open office hours right now and very few students ever visit.',
      choices: [
        { text: 'Go! Building relationships with professors is invaluable', effects: { occupational: 6, intellectual: 4, social: 3 } },
        { text: 'You don\'t have specific questions right now — maybe another time', effects: { occupational: -1 } }
      ],
      triggerCondition: gs => gs.day >= 2 && gs.timeSlot <= 1
    }
  ]
};
