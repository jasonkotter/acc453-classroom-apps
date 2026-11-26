/* Class Check question sets. Fresh practice questions written for the app (never copied from
   quizzes or exams, decision D6). Answer keys here are public JavaScript; the sets are ungraded.
   Question fields:
     type: 'choice' (default) | 'number' | 'prob'
     prompt (HTML), show: T-accounts [{who, right?, assets: [{label, amount, opt?}], liabilities: [...]}]
       (right: heading for the right-hand side; default 'Liabilities')
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
    id: 'loss-ledger', title: 'Loss Ledger: provisions, charge-offs, and the allowance', revote: true,
    note: 'Feb 11, after 07.1–07.3, before the NYCB case. A made-up bank, not NYCB data. Five questions, about 8 minutes with revotes.',
    questions: [
      {
        prompt: 'Bank A has $10M of cash and reserves, $100M of loans less a $4M allowance for loan losses, $96M of deposits, and $10M of equity. Management now expects its loans to lose more than it thought, and records a <b>provision of $3M</b>. Ignore taxes. <b>Which entries record it?</b>',
        options: [
          { id: 'a', text: 'Allowance grows from $4M to $7M (assets −⁠$3M); equity −⁠$3M', why: 'Right: an expense lowers equity, and a larger allowance lowers net loans.' },
          { id: 'b', text: 'Cash −⁠$3M; equity −⁠$3M', why: 'No money leaves the bank. A provision records an expected loss as an expense; nothing is paid.' },
          { id: 'c', text: 'Loans −⁠$3M; equity −⁠$3M', why: 'No loan has been written off yet. The bank does not know which loans will go bad, so it raises the allowance instead.' },
          { id: 'd', text: 'Cash −⁠$3M into a loan loss reserve fund; equity unchanged', why: 'Despite its name, the loan loss reserve is not cash set aside. It is an estimate subtracted from loans, and building it is an expense.' }
        ],
        answer: 'a',
        explain: 'The provision is an expense, so equity falls $3M. The allowance grows $3M, so net loans fall to $93M. No cash moves.',
        fixed: [{ who: 'Bank A', right: 'Liabilities and equity', assets: [{ label: 'Allowance ($4M → $7M)', amount: '−$3M' }], liabilities: [{ label: 'Equity', amount: '−$3M' }] }]
      },
      {
        prompt: 'Months later Bank A gives up on a $2M loan and <b>charges it off</b>, recovering nothing. <b>Which line is wrong?</b>',
        show: [
          { who: 'Bank A', right: 'Liabilities and equity', assets: [{ label: 'Loans (gross)', amount: '−$2M', opt: 'a' }, { label: 'Allowance ($7M → $5M)', amount: '+$2M', opt: 'b' }], liabilities: [{ label: 'Equity', amount: '−$2M', opt: 'c' }] }
        ],
        options: [
          { id: 'a', text: 'Loans −⁠$2M', why: 'This line is right: the loan comes off the books.' },
          { id: 'b', text: 'Allowance $7M → $5M (assets +$2M)', why: 'This line is right: the loss is written against the allowance, so it shrinks.' },
          { id: 'c', text: 'Equity −⁠$2M', why: 'The expense came with the provision; this counts the loss twice.' },
          { id: 'd', text: 'None: all three lines are right', why: 'Then assets would not change while equity fell $2M, and the balance sheet would not balance.' }
        ],
        answer: 'c',
        explain: 'The loss hit equity with the provision.'
      },
      {
        prompt: 'The next year Bank A <b>recovers $0.5M in cash</b> on the loan it charged off. Recoveries are added back to the allowance. <b>Which entries record it?</b>',
        options: [
          { id: 'a', text: 'Cash +$0.5M; allowance grows from $5M to $5.5M (assets −⁠$0.5M); equity unchanged', why: 'Right: the two asset lines offset, so equity does not change.' },
          { id: 'b', text: 'Cash +$0.5M; equity +$0.5M', why: 'The recovery goes back into the allowance. It reaches income only if management later records a smaller provision.' },
          { id: 'c', text: 'Cash +$0.5M; loans +$0.5M', why: 'The loan stays off the books; the bank is collecting on a loss it already took.' },
          { id: 'd', text: 'Allowance grows to $5.5M; equity −⁠$0.5M', why: 'The bank received cash, and nothing here is an expense.' }
        ],
        answer: 'a',
        explain: 'Cash and the allowance both rise $0.5M, so total assets and equity stay put. The recovery also lowers net charge-offs (charge-offs minus recoveries).',
        fixed: [{ who: 'Bank A', right: 'Liabilities and equity', assets: [{ label: 'Cash and reserves', amount: '+$0.5M' }, { label: 'Allowance ($5M → $5.5M)', amount: '−$0.5M' }], liabilities: [{ label: 'Equity', amount: 'no change' }] }]
      },
      {
        prompt: 'Bank A\'s loan loss reserve ratio (allowance ÷ gross loans) went from 4.0% to 7.0% with the provision, then to 5.1% ($5M ÷ $98M) with the charge-off. <b>What does the fall from 7.0% to 5.1% tell you?</b>',
        options: [
          { id: 'a', text: 'Management now expects fewer losses', why: 'Management made no new estimate. A loss it had reserved for arrived and used the allowance.' },
          { id: 'b', text: 'Little about management\'s view: an expected loss arrived and used the allowance', why: 'Right: the $2M left with the loan. Whether $5M is enough for the rest is the next question.' },
          { id: 'c', text: 'The bank under-reserved and must record another provision', why: 'The allowance absorbed the loss with $5M to spare.' },
          { id: 'd', text: 'The bank got riskier, because its equity fell again', why: 'Equity did not change with the charge-off; it fell with the provision.' }
        ],
        answer: 'b',
        explain: 'A provision moves the ratio because management\'s estimate moved. A charge-off moves it mechanically: loans and the allowance shrink together. Ask which one happened.'
      },
      {
        prompt: 'Bank Z\'s allowance is 0.8% of its loans; the median bank of its size holds 1.4%. Its charge-offs have been near zero for five years. <b>Which next fact best tells you whether its loans are safer or its losses underestimated?</b>',
        options: [
          { id: 'a', text: 'Its NPL coverage ratio against the same peers', why: 'Coverage uses the same allowance, so it repeats management\'s estimate rather than checking it.' },
          { id: 'b', text: 'Its loan mix, against banks that make the same kinds of loans', why: 'Right: 0.8% is low for credit cards and ordinary for home mortgages. Banks with the same loans are the fair comparison.' },
          { id: 'c', text: 'One more year of its net charge-off ratio', why: 'Charge-offs look backward. Another year cannot show whether untested loans will hold up.' },
          { id: 'd', text: 'Its ROE against the same peers', why: 'A small provision raises ROE either way, so ROE fits both readings.' }
        ],
        answer: 'b',
        explain: 'A low reserve ratio is a reason to investigate, not a verdict. The loan mix, judged against banks making the same loans, separates safe loans from an optimistic estimate.'
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
    keyNote: 'Compare the class with a benchmark, such as last month\'s value or the forecasters\' consensus, not only with the actual. First releases get revised: payrolls twice and then benchmarked each year, GDP in later estimates. One release is one noisy reading.',
    note: 'Jan 21, after 03.3–03.4. Name the report and month aloud and give last month\'s value; type the actual at each reveal. Check the BLS and BEA calendars for what is out by Jan 21.',
    questions: [
      { type: 'number', prompt: 'Payroll employment: the change in the most recent jobs report, in <b>thousands of jobs</b>.', unit: 'thousands', min: -2000, max: 2000, step: 1, answer: null, explain: 'Payroll changes are noisy and revised for two months, then benchmarked. One month is weak evidence.' },
      { type: 'number', prompt: 'The <b>unemployment rate</b> in the most recent jobs report.', unit: '%', min: 0, max: 25, step: 0.1, answer: null, explain: 'The rate moves slowly; most guesses near last month\'s value should be close.' },
      { type: 'number', prompt: '<b>CPI inflation</b> over the last 12 months, in the most recent CPI report.', unit: '%', min: -5, max: 20, step: 0.1, answer: null, explain: 'Twelve-month inflation changes slowly because eleven of its twelve months were already known.' },
      { type: 'number', prompt: '<b>Real GDP growth</b> in the most recent quarter, at an annual rate.', unit: '%', min: -40, max: 40, step: 0.1, answer: null, explain: 'Quarterly growth is reported at an annual rate, so it swings more than you might expect.' }
    ]
  }
  ,{
    id: 'curve-shifts', title: 'Which Curve Shifts?', revote: true,
    note: 'Feb 25, after 08.4–08.5. Six one-force scenarios in the bond-market model (supply = borrowers, demand = lenders; flip price into yield). About 8 minutes.',
    questions: [
      ['Stocks suddenly become much <b>riskier</b>: volatility doubles and stays high. What happens in the <b>Treasury</b> market?', 'a',
        'Relative risk: bonds now look safer than the alternative, so lenders want more of them at every price. Demand shifts right, the price rises, and the yield falls.'],
      ['Congress <b>cuts taxes</b> and leaves spending unchanged. What happens in the <b>Treasury</b> market?', 'c',
        'Net government financing: a bigger deficit has to be borrowed, so the Treasury sells more bonds. Supply shifts right, the price falls, and the yield rises.'],
      ['New data convince markets that <b>inflation will run higher</b> for the next decade. What happens in the <b>Treasury</b> market?', 'e',
        'Expected inflation is the force in this set that works on both sides: lenders want fewer fixed-dollar bonds (demand left) and borrowers want to borrow now, while repayment dollars are cheaper (supply right). Both push the price down, so the yield rises.'],
      ['Companies see <b>more good projects</b> to fund as the economy strengthens. What happens in the <b>corporate</b> bond market?', 'c',
        'This scenario isolates the borrower side: firms borrow when they have projects worth funding, so supply shifts right, the price falls, and the yield rises. A real expansion also raises wealth, which adds some lender demand; the usual assumption is that the supply effect is larger.'],
      ['Bond trading gets <b>cheaper and faster</b>: bid-ask spreads narrow sharply. What happens in the <b>corporate</b> bond market?', 'a',
        'Market liquidity: bonds that are easier to sell at a fair price are worth more to lenders. Demand shifts right, the price rises, and the yield falls.'],
      ['An <b>AI boom</b> raises expected stock returns well above normal. What happens in the <b>Treasury</b> market?', 'b',
        'Relative return: bonds look worse next to stocks, so lenders want fewer of them at every price. Demand shifts left, the price falls, and the yield rises.']
    ].map(([prompt, answer, explain]) => ({ prompt, answer, explain, options: [
      { id: 'a', text: 'Demand shifts right; interest rates fall', why: 'Demand is lenders. More demand raises the price, and a higher price means a lower yield.' },
      { id: 'b', text: 'Demand shifts left; interest rates rise', why: 'Ask whether lenders really want fewer bonds at every price here, or whether the force works on borrowers.' },
      { id: 'c', text: 'Supply shifts right; interest rates rise', why: 'Supply is borrowers. More borrowing lowers the price, and a lower price means a higher yield.' },
      { id: 'd', text: 'Supply shifts left; interest rates fall', why: 'That would need borrowers to want less. Check whether this force works on borrowers at all, and in which direction.' },
      { id: 'e', text: 'Both curves shift; interest rates rise', why: 'In this set, only the expected-inflation scenario is built to move both curves; each of the others isolates one force on one side. Real shocks often hit both sides at once.' }
    ] }))
  }
  ,{
    id: 'who-wins', title: 'Who Wins From Inflation?', revote: true,
    note: 'Apr 13, with 14.7 and the Who Gained case. Seven holders; inflation turns out 5 points higher than everyone expected. About 8 minutes; skip the case\'s inflation-only points if this runs first.',
    questions: [
      ['A household with a <b>30-year fixed-rate mortgage</b>.', 'a', 'The payments are fixed in dollars, so higher-than-expected inflation shrinks the real value of the debt. Borrowers with fixed-rate debt gain.'],
      ['A retiree whose savings sit in a <b>bank CD at a fixed rate</b>.', 'b', 'The CD pays fixed dollars that now buy less. Holders of fixed-dollar assets lose: inflation transfers from them to fixed-dollar borrowers.'],
      ['A retiree living on <b>Social Security</b>, which is raised each year with the CPI.', 'c', 'The cost-of-living adjustment keeps benefits roughly in step with prices, with a lag of up to a year, so the retiree is largely protected.'],
      ['The <b>federal government</b>, which owes trillions of dollars of fixed-rate debt.', 'a', 'Like any fixed-rate borrower, it repays in dollars worth less, so the real value of its existing nominal debt shrinks. That is related to, but not the same as, the inflation tax of Ch. 2, which is the narrower loss on the money people hold (currency and reserves).'],
      ['A <b>bank</b> holding fixed-rate mortgages, funded by deposits whose rates rise with market rates.', 'b', 'Its assets pay fixed dollars while its funding costs rise, and the mortgages lose market value as rates go up. This is the interest rate risk of Ch. 9 and SVB.'],
      ['An investor holding <b>TIPS</b>, Treasury bonds whose principal rises with the CPI.', 'c', 'TIPS principal rises with the CPI (with a lag of a few months), so an investor who holds to maturity earns the real yield locked in at purchase. That is roughly protected, not perfectly: sold early, the price still moves with real interest rates, and the CPI may not match this investor\'s own spending.'],
      ['A worker whose <b>wage is fixed</b> for the next two years.', 'b', 'The wage is a fixed-dollar income, so its purchasing power falls until it can be renegotiated.']
    ].map(([who, answer, explain]) => ({ prompt: `Over the next two years, inflation turns out <b>5 points higher</b> than everyone expected. ${who} Does inflation make them better or worse off in real terms?`, answer, explain, options: [
      { id: 'a', text: 'Better off', why: 'Gains go to those who owe fixed dollars: their real debt shrinks.' },
      { id: 'b', text: 'Worse off', why: 'Losses fall on those owed fixed dollars, or paid in them: what they receive buys less.' },
      { id: 'c', text: 'Roughly protected', why: 'Protection comes from payments that rise with prices, such as an index or a cost-of-living adjustment.' }
    ] }))
  }
  ,{
    id: 'retrieval-1-4', title: 'Retrieval: Ch. 1–4', revote: true,
    note: 'Jan 28, before Group Exam 1, in place of part of the crypto data discussion. Two mixed questions, about 5 minutes with revotes. After the first vote, students write on paper how sure they were (sure, think so, guessing). The transfer question runs on Feb 2.',
    questions: [
      {
        prompt: 'Over one year, M2 grows 2%, real GDP grows 3%, and the price level rises 5%. Interest rates rise sharply. What happened to the velocity of M2?',
        options: [
          { id: 'a', text: 'It rose about 6%', why: 'Right: nominal GDP grew about 8%, and 2% more money had to cover it.' },
          { id: 'b', text: 'It fell about 6%', why: 'Spending grew faster than money, so each dollar was spent more often, not less.' },
          { id: 'c', text: 'It rose about 1%', why: 'P × Y is nominal GDP: add the 5% rise in prices to the 3% real growth.' },
          { id: 'd', text: 'It did not change: velocity is constant', why: 'Velocity moves with money demand. If it were fixed, 2% money growth and 3% real growth would mean falling prices.' }
        ],
        answer: 'a',
        explain: 'In growth rates, 2% + velocity growth ≈ 5% + 3%, so velocity rose about 6%. Higher rates made holding money costly, so people held less of it per dollar of spending.'
      },
      {
        prompt: 'A grocery store takes cash, debit, and rewards credit cards, charges everyone the same price, and pays about 2.25% of each credit purchase in fees. A rewards-card holder earns 2% cash back there. <b>Who pays for the cash back?</b>',
        options: [
          { id: 'a', text: 'The card\'s issuing bank, out of the interest it earns', why: 'Interest from cardholders who carry a balance is a separate business. The rewards come from the fee on each purchase.' },
          { id: 'b', text: 'Every shopper at the store, cash and debit customers included', why: 'Right: the store raises prices for everyone to cover card fees.' },
          { id: 'c', text: 'The store, out of its profit', why: 'A store that takes every kind of payment can raise prices for everyone by enough to cover the fees.' },
          { id: 'd', text: 'No one: the card network creates the rewards', why: 'Nothing is created. The store\'s fee passes through the network to the issuing bank, which returns much of it as rewards.' }
        ],
        answer: 'b',
        explain: 'The store pays the interchange fee and prices it in. The issuing bank passes much of the fee back as rewards, so cash and debit shoppers help fund cash back they never get.'
      }
    ]
  }
  ,{
    id: 'retrieval-1-4-transfer', title: 'Retrieval transfer: Ch. 1–4', revote: false,
    note: 'Feb 2, at the start of class: one new question on the Jan 28 retrieval set. No revote, about 1 minute.',
    questions: [
      {
        prompt: 'Interest rates fall to near zero, and people leave more of their savings in bank accounts. Over a year, M2 grows 10%, velocity falls 7%, and real GDP grows 2%. About how much inflation does the quantity equation imply?',
        options: [
          { id: 'a', text: 'About 1%', why: 'Right: 10% − 7% − 2% = 1%.' },
          { id: 'b', text: 'About 8%', why: 'That leaves out velocity, which fell 7%.' },
          { id: 'c', text: 'About 10%', why: 'Money growth sets inflation only if velocity and real output stand still.' },
          { id: 'd', text: 'About 15%', why: 'Velocity fell, so it subtracts: people spent each dollar less often.' }
        ],
        answer: 'a',
        explain: 'Inflation ≈ money growth + velocity growth − real growth = 10% − 7% − 2% = 1%. From 2009 to 2019 the pattern was similar: fast money growth, falling velocity, low inflation.'
      }
    ]
  }
  ,{
    id: 'retrieval-5-7', title: 'Retrieval: Ch. 5–7', revote: true,
    note: 'Feb 18, before the midterm, in place of part of Loan Officer; keep BankFind, UBPR peers, and the project introduction. Two mixed questions, about 5 minutes with revotes. After the first vote, students write on paper how sure they were. The transfer question runs on Feb 23.',
    questions: [
      {
        prompt: 'Bank A lends Dana $300,000 by crediting her checking account. HomeFund, a nonbank lender funded by investors, lends Eli $300,000 from its own account at Bank B. <b>Which loan raises the money supply?</b>',
        options: [
          { id: 'a', text: 'Both: each puts $300,000 in a borrower\'s account', why: 'HomeFund pays with a deposit it already had, so money moves from HomeFund to Eli.' },
          { id: 'b', text: 'Only Bank A\'s', why: 'Right: Bank A pays with a new deposit, and HomeFund\'s money only changes hands.' },
          { id: 'c', text: 'Neither: lenders can lend only what savers deposited first', why: 'Bank A paid Dana with a deposit it created; no saver\'s balance fell.' },
          { id: 'd', text: 'Only HomeFund\'s: Bank A\'s is just a ledger entry', why: 'A deposit is a ledger entry, and it is the money Dana spends.' }
        ],
        answer: 'b',
        explain: 'Bank A\'s loan comes with a new $300,000 deposit. HomeFund\'s deposit falls as Eli\'s rises, so the total is unchanged: only a bank creates money when it lends.'
      },
      {
        prompt: 'A bank mails card offers that approve anyone who replies. A year later its card delinquency ratio is triple its peers\'; unemployment and peers\' ratios held steady. Many who replied had been turned down elsewhere. <b>What went wrong?</b>',
        options: [
          { id: 'a', text: 'Adverse selection, which screening would have caught', why: 'Right: the risk was a hidden type that existed before the contract.' },
          { id: 'b', text: 'Moral hazard, since the problem showed up after the cards were issued', why: 'A trait that existed all along and was discovered later is adverse selection.' },
          { id: 'c', text: 'Macro credit risk: delinquencies rise in downturns', why: 'Unemployment and peers\' ratios held steady. The problem is whom this bank lent to.' },
          { id: 'd', text: 'Moral hazard: card holders spent more once they had the card', why: 'Nothing says behavior changed; other lenders had turned these borrowers down first.' }
        ],
        answer: 'a',
        explain: 'Ask what was hidden, and when: these borrowers were risky before they replied, a hidden type. Steady peers rule out the economy.'
      }
    ]
  }
  ,{
    id: 'retrieval-5-7-transfer', title: 'Retrieval transfer: Ch. 5–7', revote: false,
    note: 'Feb 23, at the start of class: one new question on the Feb 18 retrieval set. No revote, about 1 minute.',
    questions: [
      {
        prompt: 'Acme, a manufacturer, sells a $1 million Treasury bond it owned to Bank A. Bank A pays by crediting Acme\'s checking account. <b>What happens to the money supply?</b>',
        options: [
          { id: 'a', text: 'It rises $1 million', why: 'Right: Acme swapped a bond, which is not money, for a deposit, which is.' },
          { id: 'b', text: 'It does not change: the bank swapped one asset for another', why: 'Bank A\'s deposits rose too. Acme\'s bond became money.' },
          { id: 'c', text: 'It falls $1 million: the bank spent money on the bond', why: 'Bank A paid with a new deposit; no existing money left anyone\'s account.' },
          { id: 'd', text: 'It rises $1 million times the money multiplier', why: 'No new reserves entered the banking system. The new deposit is the whole change.' }
        ],
        answer: 'a',
        explain: 'Bank A: securities +$1 million, deposits +$1 million. Like a loan, a bank\'s purchase from a nonbank creates a deposit, and deposits are money.'
      }
    ]
  }
  ,{
    id: 'retrieval-8-9', title: 'Retrieval: Ch. 8–9', revote: true,
    note: 'Mar 11, before Group Exam 2, in place of one capital-ratio problem. Two mixed questions, about 5 minutes with revotes. After the first vote, students write on paper how sure they were. The transfer question runs on Mar 16.',
    questions: [
      {
        prompt: 'Bank C bought $100M of 10-year Treasuries at par (2% annual coupon) with deposits and classified them as held to maturity. Yields on such bonds rise to 4%. <b>Which is right?</b>',
        options: [
          { id: 'a', text: 'Worth about $84M; reported equity does not show the loss', why: 'Right: HTM bonds stay at amortized cost; the loss sits in the notes.' },
          { id: 'b', text: 'No loss: Treasuries have no default risk and pay $100M at maturity', why: 'No default risk, but rate risk: a buyer today pays only about $84M for a 2% coupon.' },
          { id: 'c', text: 'Worth about $98M: yields rose 2 points, so prices fell about 2%', why: 'Ten years of payments are all discounted at 4%, so a long bond falls far more.' },
          { id: 'd', text: 'Reported equity falls about $16M: the bonds are marked to market', why: 'That is available for sale. HTM bonds are not marked to market unless the bank sells.' }
        ],
        answer: 'a',
        explain: 'At 4%, $2M a year for ten years plus $100M at the end is worth about $83.8M. HTM keeps the loss out of reported equity, but a sale to meet withdrawals makes it real.'
      },
      {
        prompt: 'With full deposit insurance, a depositor who holds is repaid whatever others do, so runs on solvent banks stop. <b>What new problem does it create, and what is the usual answer?</b>',
        options: [
          { id: 'a', text: 'Moral hazard: owners take more risk; capital rules put more of their money at stake', why: 'Right: owners keep the gains while the insurer bears losses beyond their equity.' },
          { id: 'b', text: 'Adverse selection: risky depositors seek insured banks; banks screen depositors', why: 'The hidden behavior is the bank\'s, after the insurance is in place, not the depositors\' type.' },
          { id: 'c', text: 'Inflation: the insurer must print money to pay depositors', why: 'Insurance that stops runs rarely pays; the cost is in how insured banks behave.' },
          { id: 'd', text: 'None: a run that never starts costs the insurer nothing', why: 'True of runs, but insured owners can take risks their depositors no longer police.' }
        ],
        answer: 'a',
        explain: 'Insurance changes the bank\'s behavior after the contract: moral hazard. Capital rules make owners lose first, so they have a reason to avoid reckless risk.'
      }
    ]
  }
  ,{
    id: 'retrieval-8-9-transfer', title: 'Retrieval transfer: Ch. 8–9', revote: false,
    note: 'Mar 16, at the start of class: one new question on the Mar 11 retrieval set. No revote, about 1 minute.',
    questions: [
      {
        prompt: 'A dollar stablecoin redeems coins for $1 each, first come, first served. It holds $1 of safe assets per coin, but 10% of them sit in a bank that just failed, and that money will probably come back in a few weeks. <b>What should you expect?</b>',
        options: [
          { id: 'a', text: 'A run: early redeemers get $1, and late ones may wait or get less', why: 'Right: each holder\'s best move depends on what the others do.' },
          { id: 'b', text: 'No run: each coin is still backed by 90 cents of safe assets', why: 'Early redeemers still get $1. The shortfall lands on whoever comes last, which is the reason to come early.' },
          { id: 'c', text: 'No run: runs happen only at banks', why: 'A run needs only claims paid on demand, first come, first served, against assets that cannot all be paid out at once.' },
          { id: 'd', text: 'No run: the coins are insured like bank deposits', why: 'Stablecoins are not insured deposits.' }
        ],
        answer: 'a',
        explain: 'It is the bank-run game: if others hold, holding is fine; if others redeem, redeeming first pays. In March 2023 a stablecoin with backing stuck at SVB briefly traded near 88 cents.'
      }
    ]
  }
  ,{
    id: 'retrieval-synthesis', title: 'Retrieval: course synthesis (optional)', revote: true,
    note: 'Optional, Apr 13, only if Who Wins From Inflation and the capstone leave time. Two questions that join chapters, about 5 minutes with revotes. After the first vote, students write on paper how sure they were.',
    questions: [
      {
        prompt: 'The Fed holds its policy rate at 4.0% for a year. Over that year, expected inflation rises from 2.0% to 3.5%. <b>What happened to the stance of monetary policy?</b>',
        options: [
          { id: 'a', text: 'It eased: the real rate fell from 2.0% to 0.5%', why: 'Right: a fixed nominal rate with rising expected inflation means a lower real rate.' },
          { id: 'b', text: 'Nothing: the Fed did not move its rate', why: 'Borrowers and lenders care about the real rate, which fell 1.5 points.' },
          { id: 'c', text: 'It tightened: the real rate rose from 6.0% to 7.5%', why: 'The real rate subtracts expected inflation: 4.0% − 3.5% = 0.5%.' },
          { id: 'd', text: 'It tightened: higher inflation makes a 4% loan harder to repay', why: 'Higher inflation makes fixed-dollar debt easier to repay in real terms.' }
        ],
        answer: 'a',
        explain: 'Real rate ≈ nominal rate − expected inflation: 4.0 − 2.0 = 2.0% before, 4.0 − 3.5 = 0.5% after. To hold policy steady, the Fed would have had to raise its rate point for point.'
      },
      {
        prompt: 'Country P pegs its peso to the dollar and holds $20 billion of dollar reserves. Investors who doubt the peg want to swap $30 billion of pesos for dollars at the pegged rate. <b>Which is right?</b>',
        options: [
          { id: 'a', text: 'It can create pesos but not dollars, so this is a run on its dollar reserves', why: 'Right: each sale draws down reserves and invites the next.' },
          { id: 'b', text: 'It can create the extra $10 billion; central banks create money', why: 'Each central bank creates its own currency. Only the Fed creates dollars.' },
          { id: 'c', text: 'Cutting its interest rate will support the peg', why: 'A lower peso rate makes pesos less attractive and speeds the outflow.' },
          { id: 'd', text: 'Nothing happens: under a peg the exchange rate cannot change', why: 'A peg is a promise to buy pesos at a fixed price, and it breaks when the dollars run out.' }
        ],
        answer: 'a',
        explain: 'The central bank can create pesos but not the dollars it promised, so a speculative attack is the bank-run game of Ch. 9 played against a central bank.'
      }
    ]
  }
  ,{
    id: 'shock-hearing', title: 'Shock Hearing: same inflation, different shock', revote: true,
    note: 'Mar 30, before the case data (Transitory or Volcker), in place of ranking the channels. Five questions on two made-up economies, about 10 minutes with revotes; if short, run 1, 4, and 5. Then a paper vote, not scored: hike, hold, or cut in Economy S, with a reason, a horizon, and the fact that would change your mind.',
    questions: [
      {
        prompt: 'Both economies have 5% inflation. <b>D:</b> unemployment fell from 4.0% to 3.2%, wages are up 6%, services inflation is 4.8%. <b>S:</b> energy prices jumped 40% after a shipping disruption, unemployment rose from 4.0% to 4.6%, services inflation is 2.3%. <b>Which describes them?</b>',
        options: [
          { id: 'a', text: 'D: too much demand. S: a supply shock', why: 'Right: in D inflation and output rose together; in S output fell.' },
          { id: 'b', text: 'D: a supply shock. S: too much demand', why: 'Reversed: falling unemployment and rising wages, as in D, mean demand.' },
          { id: 'c', text: 'Both too much demand: 5% inflation in each', why: 'One inflation number cannot tell them apart; unemployment moved in opposite directions.' },
          { id: 'd', text: 'Both supply shocks: prices outran wages', why: 'In D wages rose 6%, faster than prices, in a tight labor market.' }
        ],
        answer: 'a',
        explain: 'Demand moves inflation and output the same way; a supply shock moves them in opposite directions (Ch. 12 §10).'
      },
      {
        prompt: 'Economy S raises its policy rate sharply to bring inflation down fast. <b>In the AD–AS model, what happens?</b>',
        options: [
          { id: 'a', text: 'Inflation falls, and output falls further', why: 'Right: a higher rate lowers demand. Against a supply shock that buys lower inflation with a deeper slump.' },
          { id: 'b', text: 'Inflation falls, and output recovers', why: 'That is the demand-shock case, where the two goals point the same way.' },
          { id: 'c', text: 'Nothing: rate increases work only on demand inflation', why: 'They work through demand in both cases. The difference is what they cost in output.' },
          { id: 'd', text: 'Energy prices return to where they were', why: 'The rate cannot reopen the shipping route. The cost shock stays.' }
        ],
        answer: 'a',
        explain: 'No rate fixes both problems after a supply shock: tighten and output falls further, ease and inflation rises further. That is why supply shocks are harder than demand shocks.'
      },
      {
        prompt: 'Economy S\'s central bank wants to look through the energy shock. <b>Which evidence over the next few months best tells it whether the shock is spreading?</b>',
        options: [
          { id: 'a', text: 'Services inflation, wage growth, and expected inflation', why: 'Right: a temporary shock fades on its own only if it does not spread into these.' },
          { id: 'b', text: 'Next month\'s headline inflation', why: 'Headline inflation is mostly energy right now. It shows the shock, not whether it is spreading.' },
          { id: 'c', text: 'The price of energy', why: 'That tells you how big the shock is. Spreading means other prices and wages following it.' },
          { id: 'd', text: 'The unemployment rate alone', why: 'Unemployment is already rising because of the shock. It cannot show whether inflation is spreading.' }
        ],
        answer: 'a',
        explain: 'Looking through is a bet that expectations hold. Core and services inflation, wages, and expectations are where a one-time price jump would turn into lasting inflation.'
      },
      {
        prompt: 'Both central banks hold their rate at 4.0%, and both had 5.0% inflation over the past year. People expect 4.5% inflation next year in D and 2.5% in S. <b>Which is right?</b>',
        options: [
          { id: 'a', text: 'Policy is easier in D (real rate about −⁠0.5%) than in S (about 1.5%)', why: 'Right: subtract the inflation people expect over the loan, not last year\'s.' },
          { id: 'b', text: 'The same in both: each real rate is −⁠1.0%', why: 'That subtracts past inflation. Borrowers decide on what they expect next, and that differs.' },
          { id: 'c', text: 'The same in both: the policy rate is the same', why: 'The same nominal rate can be easy in one economy and tight in another.' },
          { id: 'd', text: 'Tighter in D, where expected inflation is higher', why: 'Higher expected inflation lowers the real rate at a given nominal rate.' }
        ],
        answer: 'a',
        explain: 'Real rate ≈ nominal rate −⁠ expected inflation: 4.0 −⁠ 4.5 = −⁠0.5% in D, 4.0 −⁠ 2.5 = 1.5% in S. In an energy shock, past and expected inflation diverge, so which one you subtract matters.'
      },
      {
        prompt: 'S looks through the shock and holds at 4.0%. Three months later, services inflation has risen to 4% and people now expect 4.5% inflation next year. <b>What changed?</b>',
        options: [
          { id: 'a', text: 'It is spreading; holding at 4.0% now eases policy', why: 'Right: the real rate fell from about 1.5% to about −⁠0.5% with no move.' },
          { id: 'b', text: 'Nothing: energy caused it, so keep looking through', why: 'Looking through assumed the shock would not spread into services and expectations. It has.' },
          { id: 'c', text: 'The shock is over: energy prices stopped rising', why: 'Energy has stopped, but services prices and expectations are rising on their own.' },
          { id: 'd', text: 'Hike now and inflation is back to 2% this quarter', why: 'Rate changes take a year or more to reach inflation.' }
        ],
        answer: 'a',
        explain: 'This is the trigger the hold depended on. In the 1970s real rates fell, and each energy shock left inflation higher.'
      }
    ]
  }
  ,{
    id: 'capital-layers', title: 'Capital layers: which one takes the loss?', revote: true,
    note: 'Optional, Mar 11, right after Repair the Capital Ratio: one question on CET1, AT1, and Tier 2. Skip it if the AT1 case runs that day. About 2 minutes with the revote.',
    questions: [
      {
        prompt: 'A bank has RWA of 80 and three layers of capital: CET1 4, AT1 2, Tier 2 2. Supplied floors: 4.5% CET1, 6% Tier 1, 8% total. A loss of 1.5 hits, and RWA falls to 78.5. <b>Which layer absorbed the loss, and which ratio still passes?</b>',
        options: [
          { id: 'a', text: 'CET1 absorbed it; only the total-capital ratio still passes', why: 'Right: CET1 is 3.2% and Tier 1 5.7%, both below their floors; total capital is 8.3%.' },
          { id: 'b', text: 'Tier 2 absorbed it, since it is the last layer counted', why: 'Common equity takes losses first. Tier 2 absorbed nothing here.' },
          { id: 'c', text: 'The loss was split evenly across the three layers', why: 'The layers are ranked, and common equity takes losses first.' },
          { id: 'd', text: 'CET1 absorbed it, so all three ratios fail', why: 'Tier 2 still counts toward total capital: (2.5 + 2 + 2) ÷ 78.5 = 8.3%.' }
        ],
        answer: 'a',
        explain: 'CET1: 4 −⁠ 1.5 = 2.5, or 3.2% of 78.5. Tier 1 adds AT1: 4.5, or 5.7%. Total adds Tier 2: 6.5, or 8.3%. Tier 2 counts toward the total but absorbed nothing.'
      }
    ]
  }
];
