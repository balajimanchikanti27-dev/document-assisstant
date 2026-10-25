import React from 'react';

const STEPS = [
  {
    step: '01',
    title: 'Select a Mode',
    desc: 'Choose between grounded document answering or live AI web research depending on your question.',
  },
  {
    step: '02',
    title: 'Ask or Upload',
    desc: 'Upload your PDF, PowerPoint, or Word files, or type any research question into the prompt box.',
  },
  {
    step: '03',
    title: 'Retrieve Evidence',
    desc: 'The system retrieves relevant vector passages or web source snippets without hallucination.',
  },
  {
    step: '04',
    title: 'Receive Answers with Sources',
    desc: 'Read a synthesized explanation with exact page citations, slide numbers, and verified web links.',
  },
];

export const HowItWorksSection: React.FC = () => {
  return (
    <section id="how-it-works" className="py-16 md:py-20 px-4 sm:px-6 max-w-6xl mx-auto border-t border-neutral-200 dark:border-neutral-800">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight mb-3">
          How It Works
        </h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Four simple steps to get verifiable, trustworthy answers to your questions.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {STEPS.map((item, idx) => (
          <div
            key={idx}
            className="relative p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/40 flex flex-col justify-between"
          >
            <div>
              <span className="text-2xl font-black font-mono text-brand-600/40 dark:text-brand-400/30 block mb-3">
                {item.step}
              </span>
              <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                {item.title}
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                {item.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
