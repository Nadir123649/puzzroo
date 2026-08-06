export interface FAQItem {
  id: string
  question: string
  answer: string
}

export const faqData: FAQItem[] = [
  {
    id: 'faq-1',
    question: 'What is Puzzroo?',
    answer:
      'Puzzroo is a premium puzzle platform where you can play daily brain games like Sudoku, Nonograms, and logic challenges all in one place and of course for free.',
  },
  {
    id: 'faq-2',
    question: 'Is it really free to play?',
    answer:
      'Yes! Puzzroo offers a completely free tier with access to all basic puzzle games. You can play as many games as you want without any cost. We also offer a Premium plan with additional features like ad-free experience, exclusive puzzles, and advanced statistics.',
  },
  {
    id: 'faq-3',
    question: 'Why should I register?',
    answer:
      'Registration allows you to save your progress, track your statistics, compete on leaderboards, and access your games across multiple devices. Plus, registered users get daily exclusive puzzles and can participate in special events and seasonal challenges.',
  },
  {
    id: 'faq-4',
    question: "What's included in the Premium plan?",
    answer:
      'Premium members get unlimited access to all games, 100% ad-free experience, priority customer support, early access to new games, custom difficulty settings, progress tracking & stats, and access to exclusive brain training programs.',
  },
  {
    id: 'faq-5',
    question: 'Can I play without an internet connection?',
    answer:
      'Yes! Premium members can download puzzles for offline play. This feature allows you to enjoy your favorite brain games anytime, anywhere, even without an internet connection.',
  },
  {
    id: 'faq-6',
    question: 'Do you add new games regularly?',
    answer:
      'Absolutely! We regularly update our puzzle library with new games and variations. Premium members get early access to new releases, and we also run seasonal events with limited-time puzzle challenges.',
  },
  {
    id: 'faq-7',
    question: 'Can I cancel my subscription anytime?',
    answer:
      'Yes, you can cancel your Premium subscription at any time with no cancellation fees. Your Premium benefits will remain active until the end of your current billing period.',
  },
]
