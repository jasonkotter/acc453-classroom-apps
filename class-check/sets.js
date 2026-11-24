/* Class Check question sets. Fresh practice questions written for the app (never copied from
   quizzes or exams, decision D6). Answer keys here are public JavaScript; the sets are ungraded.
   Question fields:
     type: 'choice' (default) | 'number' | 'prob'
     prompt (HTML), show: T-accounts [{who, assets: [{label, amount, opt?}], liabilities: [...]}]
       (opt links a line to an answer letter; the wrong line is struck through at the review)
     options: [{id, text, why}], answer, explain, fixed: corrected T-accounts shown at the review
     number questions: unit, min, max, step, answer (leave null to type the actual at the review) */
window.CLASS_CHECK_SETS = [
  {
    id: 'accounting-loans', title: 'Find the Accounting Error: loans and payments', revote: true,
    note: 'Feb 2, after 05.2–05.4. Five questions, about 8 minutes with revotes.',
    questions: [
      {
        prompt: 'Bank A lends Maria $10,000 by crediting her checking account. Here are the proposed entries. <b>Which line is wrong?</b>',
        show: [
          { who: 'Maria', assets: [{ label: 'Checking deposit at Bank A', amount: '+$10,000', opt: 'a' }], liabilities: [{ label: 'Loan from Bank A', amount: '+$10,000', opt: 'b' }] },
          { who: 'Bank A', assets: [{ label: 'Loan to Maria', amount: '+$10,000', opt: 'c' }, { label: 'Reserves', amount: '−$10,000', opt: 'd' }], liabilities: [] }
        ],
        options: [
          { id: 'a', text: 'Maria: checking deposit +$10,000', why: 'This line is right: the new deposit is Maria\'s asset.' },
          { id: 'b', text: 'Maria: loan from Bank A +$10,000', why: 'This line is right: Maria now owes the bank.' },
          { id: 'c', text: 'Bank A: loan to Maria +$10,000', why: 'This line is right: the loan is the bank\'s asset.' },
          { id: 'd', text: 'Bank A: reserves −$10,000', why: 'Making the loan does not use reserves. The bank credits Maria\'s account, so its new liability is a deposit.' }
        ],
        answer: 'd',
        explain: 'A loan creates a deposit. Both sides of Bank A\'s balance sheet grow by $10,000. Reserves move only when Maria spends the money at another bank.',
        fixed: [{ who: 'Bank A', assets: [{ label: 'Loan to Maria', amount: '+$10,000' }], liabilities: [{ label: 'Deposits (Maria)', amount: '+$10,000' }] }]
      },
      {
        prompt: 'Same loan. <b>What should replace</b> Bank A\'s "reserves −$10,000"?',
        options: [
          { id: 'a', text: 'Bank A, liabilities: deposits (Maria) +$10,000', why: 'Right: the bank owes Maria the money in her account.' },
          { id: 'b', text: 'Bank A, assets: reserves +$10,000', why: 'A commercial bank cannot create reserves; only the Fed can.' },
          { id: 'c', text: 'Bank A, equity +$10,000', why: 'Lending does not make the bank richer: the loan and the deposit offset each other.' },
          { id: 'd', text: 'Nothing: the loan line is enough', why: 'Then Bank A\'s assets rise $10,000 with nothing on the other side, so the balance sheet would not balance.' }
        ],
        answer: 'a',
        explain: 'Every entry has a matching entry. The loan (an asset) is matched by the deposit (a liability).'
      },
      {
        prompt: 'Maria pays her $10,000 to Tom, who banks at Bank B. <b>Which line is wrong?</b>',
        show: [
          { who: 'Bank A', assets: [{ label: 'Loans', amount: '−$10,000', opt: 'a' }], liabilities: [{ label: 'Deposits (Maria)', amount: '−$10,000', opt: 'b' }] },
          { who: 'Bank B', assets: [{ label: 'Reserves', amount: '+$10,000', opt: 'c' }], liabilities: [{ label: 'Deposits (Tom)', amount: '+$10,000', opt: 'd' }] }
        ],
        options: [
          { id: 'a', text: 'Bank A: loans −$10,000', why: 'Maria still owes the loan. Bank A settles the payment by sending reserves to Bank B.' },
          { id: 'b', text: 'Bank A: deposits −$10,000', why: 'This line is right: Maria\'s account is drawn down.' },
          { id: 'c', text: 'Bank B: reserves +$10,000', why: 'This line is right: Bank B receives the reserves that settle the payment.' },
          { id: 'd', text: 'Bank B: deposits +$10,000', why: 'This line is right: Tom\'s account is credited.' }
        ],
        answer: 'a',
        explain: 'The payment moves a deposit from Bank A to Bank B, and reserves move with it to settle. The loan stays on Bank A\'s books until Maria repays it.',
        fixed: [
          { who: 'Bank A', assets: [{ label: 'Reserves', amount: '−$10,000' }], liabilities: [{ label: 'Deposits (Maria)', amount: '−$10,000' }] },
          { who: 'Bank B', assets: [{ label: 'Reserves', amount: '+$10,000' }], liabilities: [{ label: 'Deposits (Tom)', amount: '+$10,000' }] }
        ]
      },
      {
        prompt: 'Compared with just before Maria paid Tom, <b>what happened to M1</b> because of the payment?',
        options: [
          { id: 'a', text: 'It rose $10,000', why: 'M1 rose $10,000 earlier, when the loan was made. The payment itself adds nothing.' },
          { id: 'b', text: 'It fell $10,000', why: 'Maria\'s deposit fell, but Tom\'s rose by the same amount.' },
          { id: 'c', text: 'It did not change', why: 'Right: a deposit moved from one bank to another, and the public holds the same total.' },
          { id: 'd', text: 'It rose $20,000', why: 'The same $10,000 cannot be counted twice: Maria no longer has it.' }
        ],
        answer: 'c',
        explain: 'Money was created when the loan was made. Paying it to someone at another bank moves it; it does not create or destroy it.'
      },
      {
        prompt: 'Tom withdraws $500 in cash from Bank B. <b>What happens to the monetary base</b> (currency in circulation plus reserves)?',
        options: [
          { id: 'a', text: 'It rises $500', why: 'Currency held by the public rises $500, but Bank B\'s vault cash, which counts as reserves, falls $500.' },
          { id: 'b', text: 'It falls $500', why: 'The $500 has not left the base; it moved from reserves to currency in circulation.' },
          { id: 'c', text: 'It does not change', why: 'Right: currency in circulation +$500, reserves (vault cash) −$500.' },
          { id: 'd', text: 'It falls by $500 times the money multiplier', why: 'The withdrawal changes the mix of the base, not its size.' }
        ],
        answer: 'c',
        explain: 'Tom swaps a deposit for currency, so M1 does not change either. The base changes its mix: more currency, fewer reserves.'
      }
    ]
  },
  {
    id: 'accounting-fed', title: 'Find the Accounting Error: the Fed buys bonds', revote: true,
    note: 'Mar 18, after 11.2–11.3. Four questions, about 7 minutes with revotes.',
    questions: [
      {
        prompt: 'The Fed buys $1 million of Treasury bills from a dealer who banks at Bank B. <b>Which line is wrong?</b>',
        show: [
          { who: 'The Fed', assets: [{ label: 'Treasury securities', amount: '+$1,000,000', opt: 'a' }], liabilities: [{ label: 'Currency in circulation', amount: '+$1,000,000', opt: 'b' }] },
          { who: 'Bank B', assets: [{ label: 'Reserves', amount: '+$1,000,000', opt: 'c' }], liabilities: [{ label: 'Deposits (dealer)', amount: '+$1,000,000', opt: 'd' }] }
        ],
        options: [
          { id: 'a', text: 'Fed: Treasury securities +$1,000,000', why: 'This line is right: the Fed now owns the bills.' },
          { id: 'b', text: 'Fed: currency in circulation +$1,000,000', why: 'The Fed pays by crediting Bank B\'s reserve account. Currency rises only if someone later withdraws cash.' },
          { id: 'c', text: 'Bank B: reserves +$1,000,000', why: 'This line is right: Bank B\'s account at the Fed is credited.' },
          { id: 'd', text: 'Bank B: deposits (dealer) +$1,000,000', why: 'This line is right: Bank B credits the dealer\'s account.' }
        ],
        answer: 'b',
        explain: 'An open market purchase is paid for with new reserves, created by a keystroke at the Fed.',
        fixed: [{ who: 'The Fed', assets: [{ label: 'Treasury securities', amount: '+$1,000,000' }], liabilities: [{ label: 'Reserves (Bank B)', amount: '+$1,000,000' }] }]
      },
      {
        prompt: 'After that purchase, <b>what happened to the monetary base?</b>',
        options: [
          { id: 'a', text: 'It rose $1,000,000', why: 'Right: reserves rose $1,000,000 and nothing else in the base fell.' },
          { id: 'b', text: 'It did not change', why: 'The dealer gave up bills, which are not part of the base, and Bank B gained reserves, which are.' },
          { id: 'c', text: 'It rose $1,000,000 times the money multiplier', why: 'The base rises by the purchase. More deposits would come later, and only if banks lend.' },
          { id: 'd', text: 'It fell $1,000,000', why: 'The Fed added reserves; it did not take any away.' }
        ],
        answer: 'a',
        explain: 'The base is the Fed\'s monetary liabilities: currency plus reserves. Buying an asset adds a liability of the same size.'
      },
      {
        prompt: 'Later the Fed <b>sells</b> $1 million of bills to a dealer who banks at Bank A. Which entry is right for Bank A?',
        options: [
          { id: 'a', text: 'Reserves −$1,000,000; deposits (dealer) −$1,000,000', why: 'Right: the dealer pays from its account and Bank A\'s reserve account is debited.' },
          { id: 'b', text: 'Reserves +$1,000,000; deposits (dealer) +$1,000,000', why: 'That is a purchase. A sale drains reserves.' },
          { id: 'c', text: 'Securities +$1,000,000; reserves −$1,000,000', why: 'The dealer bought the bills, not Bank A.' },
          { id: 'd', text: 'Loans −$1,000,000; deposits (dealer) −$1,000,000', why: 'No loan was repaid. The payment is settled in reserves.' }
        ],
        answer: 'a',
        explain: 'A sale is the purchase in reverse: reserves and deposits both shrink.'
      },
      {
        prompt: 'The Fed lends Bank A $200,000 through the discount window. <b>Which line is wrong?</b>',
        show: [
          { who: 'The Fed', assets: [{ label: 'Discount window loans', amount: '+$200,000', opt: 'a' }], liabilities: [{ label: 'Reserves (Bank A)', amount: '+$200,000', opt: 'b' }] },
          { who: 'Bank A', assets: [{ label: 'Reserves', amount: '+$200,000', opt: 'c' }], liabilities: [{ label: 'Deposits', amount: '+$200,000', opt: 'd' }] }
        ],
        options: [
          { id: 'a', text: 'Fed: discount window loans +$200,000', why: 'This line is right: the loan is the Fed\'s asset.' },
          { id: 'b', text: 'Fed: reserves (Bank A) +$200,000', why: 'This line is right: the Fed pays by crediting Bank A\'s reserve account.' },
          { id: 'c', text: 'Bank A: reserves +$200,000', why: 'This line is right: Bank A has more reserves.' },
          { id: 'd', text: 'Bank A: deposits +$200,000', why: 'Bank A borrowed from the Fed; no customer deposited anything. Its new liability is the loan from the Fed.' }
        ],
        answer: 'd',
        explain: 'Bank A\'s liability is "borrowing from the Fed." Deposits are what the bank owes its customers.',
        fixed: [{ who: 'Bank A', assets: [{ label: 'Reserves', amount: '+$200,000' }], liabilities: [{ label: 'Borrowing from the Fed', amount: '+$200,000' }] }]
      }
    ]
  },
  {
    id: 'guess-release', title: 'Guess the Release', revote: false,
    note: 'Jan 21, after 03.3–03.4. Name the report and month aloud and give last month\'s value; type the actual at each reveal. Check the BLS and BEA calendars for what is out by Jan 21.',
    questions: [
      { type: 'number', prompt: 'Payroll employment: the change in the most recent jobs report, in <b>thousands of jobs</b>.', unit: 'thousands', min: -2000, max: 2000, step: 1, answer: null, explain: 'Payroll changes are noisy and revised for two months, then benchmarked. One month is weak evidence.' },
      { type: 'number', prompt: 'The <b>unemployment rate</b> in the most recent jobs report.', unit: '%', min: 0, max: 25, step: 0.1, answer: null, explain: 'The rate moves slowly; most guesses near last month\'s value should be close.' },
      { type: 'number', prompt: '<b>CPI inflation</b> over the last 12 months, in the most recent CPI report.', unit: '%', min: -5, max: 20, step: 0.1, answer: null, explain: 'Twelve-month inflation changes slowly because eleven of its twelve months were already known.' },
      { type: 'number', prompt: '<b>Real GDP growth</b> in the most recent quarter, at an annual rate.', unit: '%', min: -40, max: 40, step: 0.1, answer: null, explain: 'Quarterly growth is reported at an annual rate, so it swings more than you might expect.' }
    ]
  }
];
