import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronDown,
  ChevronUp,
  ChevronRight,
  HelpCircle,
  UserCog,
  CreditCard,
  Brain,
  MessageSquare,
  Shield,
  Layers,
  FileText,
} from 'lucide-react';

interface FAQItem {
  q: string;
  a: string;
}

interface FAQCategory {
  id: string;
  label: string;
  icon: React.ElementType;
  items: FAQItem[];
}

const categories: FAQCategory[] = [
  {
    id: 'general',
    label: 'General',
    icon: HelpCircle,
    items: [
      {
        q: 'What is TabKeep?',
        a: 'TabKeep is an AI assistant that remembers who you are across conversations. It uses advanced AI models (Claude and GPT-5) with a persistent memory system to provide personalized, context-aware responses.',
      },
      {
        q: 'Do I need an account to use TabKeep?',
        a: 'Yes, an account is required so TabKeep can save your chat history, preferences, and memories. Sign up is free and takes a few seconds.',
      },
      {
        q: 'Which AI models does TabKeep use?',
        a: 'TabKeep uses Claude (Sonnet 4.5 with extended thinking for complex tasks) and GPT-5 (for real-time queries and current events). The system automatically routes your query to the best model.',
      },
      {
        q: 'Is TabKeep available on mobile?',
        a: 'TabKeep is a web application that works in any modern browser, including mobile browsers. A dedicated mobile app is planned for a future release.',
      },
    ],
  },
  {
    id: 'account',
    label: 'Account & Billing',
    icon: UserCog,
    items: [
      {
        q: 'How do I change my display name or avatar?',
        a: 'Go to Settings > Account. You can update your display name, username, and avatar from there. Changes are saved immediately.',
      },
      {
        q: 'How do I change my password?',
        a: 'Go to Settings > Account and click "Change Password." Enter your new password (minimum 6 characters) and confirm it.',
      },
      {
        q: 'Can I delete my account?',
        a: 'Yes. Go to Settings > Delete Account, type "DELETE" in the confirmation field, and click the delete button. This permanently removes all your data and cannot be undone.',
      },
      {
        q: 'How do I upgrade my plan?',
        a: 'Go to Settings > Plan to see available plans and upgrade. Pro costs $20/month and Max costs $200/month. You can cancel anytime.',
      },
    ],
  },
  {
    id: 'ai-chat',
    label: 'AI & Chat',
    icon: MessageSquare,
    items: [
      {
        q: 'How does the AI choose which model to use?',
        a: 'TabKeep analyzes your message for patterns. Questions about current events, prices, or real-time data route to GPT-5. Complex coding, analysis, and technical tasks route to Claude with extended thinking.',
      },
      {
        q: 'Can I attach images or videos?',
        a: 'Yes. Click the attachment button in the search bar to add images or videos. The AI can analyze visual content, describe images, extract text, and discuss what it sees.',
      },
      {
        q: 'What happens if I hit my usage limit?',
        a: 'Free users get 100 intelligence units per month. Pro users get 500 units with a 3-hour cooldown reset. Max users have unlimited usage. When you reach your limit, you\'ll see a notification with your reset time.',
      },
      {
        q: 'Can I stop the AI mid-response?',
        a: 'Yes. Click the stop button that appears while the AI is generating a response, or press Escape.',
      },
      {
        q: 'What is "extended thinking"?',
        a: 'Extended thinking allows Claude to reason through complex problems before responding. It uses a 10,000-token thinking budget for deep analysis, resulting in more thorough and accurate responses for difficult tasks.',
      },
    ],
  },
  {
    id: 'memory',
    label: 'Memory System',
    icon: Brain,
    items: [
      {
        q: 'What are Memory Anchors?',
        a: 'Memory Anchors are persistent AI brains that store what the AI knows about you. They survive chat deletions -- when you delete a conversation, the memories extracted from it remain in your anchor.',
      },
      {
        q: 'How do I add a memory?',
        a: 'Go to Settings > Memory and type a memory in the "Add a memory" field. For example: "I prefer concise responses" or "I\'m a frontend developer based in New York." Press Enter or click the + button.',
      },
      {
        q: 'Does the AI automatically learn about me?',
        a: 'Yes. After conversations with 4 or more messages, TabKeep automatically analyzes the chat and extracts key learnings -- your preferences, communication style, and important facts. These are stored as "Learned" memories.',
      },
      {
        q: 'Can I delete specific memories?',
        a: 'Yes. In Settings > Memory, click on any memory card to expand it, then click the Delete button. You can also clear all memories at once.',
      },
      {
        q: 'Do memories work on the free plan?',
        a: 'Yes. All plans have access to memory features. Free users get 1 memory anchor with up to 15 memories loaded per conversation. Pro and Max users get more anchors and higher memory limits.',
      },
    ],
  },
  {
    id: 'plans',
    label: 'Plans & Pricing',
    icon: CreditCard,
    items: [
      {
        q: 'What\'s included in the free plan?',
        a: '100 intelligence units per month, 1 memory anchor, full chat history, memory context in conversations, and access to both Claude and GPT-5 models.',
      },
      {
        q: 'What\'s the difference between Pro and Max?',
        a: 'Pro ($20/month) gives you 500 units with 3-hour resets, 5 anchors, and priority responses. Max ($200/month) gives unlimited everything -- no usage limits, unlimited anchors, 50 memories per anchor, and fastest response times.',
      },
      {
        q: 'Can I cancel my subscription anytime?',
        a: 'Yes. You can cancel at any time and keep access until the end of your billing period.',
      },
      {
        q: 'What payment methods are accepted?',
        a: 'All major credit cards, debit cards, and PayPal are accepted.',
      },
    ],
  },
  {
    id: 'privacy',
    label: 'Privacy & Security',
    icon: Shield,
    items: [
      {
        q: 'Is my data safe?',
        a: 'Yes. Your data is stored securely in Supabase with row-level security (RLS) -- you can only access your own data. We use HTTPS for all communications and do not sell data to third parties.',
      },
      {
        q: 'Can I export my data?',
        a: 'Data export functionality is planned for a future release. Contact support@tabkeep.app if you need your data exported.',
      },
      {
        q: 'Are my conversations used to train AI models?',
        a: 'Your conversations are sent to AI providers (Anthropic, OpenAI) to generate responses. Refer to their respective privacy policies for details on data handling. TabKeep does not independently train models on your data.',
      },
      {
        q: 'How do I delete all my data?',
        a: 'Deleting your account removes all associated data -- chat history, memories, profile info. Go to Settings > Delete Account to proceed.',
      },
    ],
  },
];

const FAQ = () => {
  const [activeCategory, setActiveCategory] = useState('general');
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const categoryRefs = useRef<Record<string, HTMLElement | null>>({});

  // IntersectionObserver for scroll-based active category tracking
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveCategory(visible[0].target.id);
        }
      },
      {
        root: contentRef.current,
        rootMargin: '-10% 0px -70% 0px',
        threshold: 0,
      }
    );

    categories.forEach(({ id }) => {
      const el = categoryRefs.current[id];
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const scrollToCategory = (id: string) => {
    const el = categoryRefs.current[id];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const setCategoryRef = (id: string) => (el: HTMLElement | null) => {
    categoryRefs.current[id] = el;
  };

  const toggleQuestion = (key: string) => {
    setExpandedQuestion(expandedQuestion === key ? null : key);
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-[#e5e5e5] flex flex-col">
      {/* Header */}
      <header className="flex items-center px-8 py-4 border-b border-[#1f1f1f] bg-[#0a0a0a]/80 backdrop-blur-sm shrink-0 sticky top-0 z-50">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 group-hover:border-blue-400/50 transition-colors">
            <Layers className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <div className="text-xs text-[#666] uppercase tracking-wide font-medium">TabKeep</div>
            <div className="text-sm font-semibold text-[#e5e5e5] -mt-0.5">FAQ</div>
          </div>
        </Link>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <nav className="w-64 shrink-0 border-r border-[#1f1f1f] py-8 px-4 overflow-y-auto bg-[#0a0a0a]">
          <h3 className="px-3 text-[11px] uppercase tracking-widest text-[#555] font-semibold mb-4">Categories</h3>
          <ul className="space-y-1">
            {categories.map(({ id, label, icon: Icon }) => (
              <li key={id}>
                <button
                  onClick={() => scrollToCategory(id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group ${
                    activeCategory === id
                      ? 'bg-[#1a1a1a] text-[#fff] border-l-[3px] border-blue-500 pl-[9px]'
                      : 'text-[#888] hover:text-[#e5e5e5] hover:bg-[#141414] border-l-[3px] border-transparent'
                  }`}
                >
                  <Icon className={`w-[18px] h-[18px] shrink-0 transition-colors ${
                    activeCategory === id ? 'text-blue-400' : 'text-[#555] group-hover:text-[#888]'
                  }`} />
                  <span className="truncate font-medium">{label}</span>
                  {activeCategory === id && <ChevronRight className="w-3.5 h-3.5 ml-auto text-blue-400" />}
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-10 pt-6 border-t border-[#1f1f1f]">
            <p className="px-3 text-[11px] uppercase tracking-widest text-[#555] font-semibold mb-3">Other Pages</p>
            <Link
              to="/docs"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#888] hover:text-[#e5e5e5] hover:bg-[#141414] transition-all group"
            >
              <FileText className="w-[18px] h-[18px] text-[#555] group-hover:text-[#888]" />
              <span className="font-medium">Documentation</span>
              <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          </div>
        </nav>

        {/* Content */}
        <main ref={contentRef} className="flex-1 overflow-y-auto px-12 py-12 bg-[#0f0f0f]">
          <div className="max-w-3xl mx-auto space-y-16">

            {categories.map((cat) => (
              <section
                key={cat.id}
                id={cat.id}
                ref={setCategoryRef(cat.id)}
              >
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-2">
                    <cat.icon className="w-5 h-5 text-blue-400" />
                    <h2 className="text-2xl font-bold text-[#fff]">{cat.label}</h2>
                  </div>
                </div>

                <div className="space-y-3">
                  {cat.items.map((item, idx) => {
                    const key = `${cat.id}-${idx}`;
                    const isExpanded = expandedQuestion === key;

                    return (
                      <div
                        key={key}
                        className="rounded-xl bg-[#141414] border border-[#202020] hover:border-[#282828] transition-colors overflow-hidden"
                      >
                        <button
                          onClick={() => toggleQuestion(key)}
                          className="w-full flex items-start justify-between gap-4 p-5 text-left group"
                        >
                          <span className="text-sm font-semibold text-[#fff] group-hover:text-blue-400 transition-colors">{item.q}</span>
                          {isExpanded
                            ? <ChevronUp className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                            : <ChevronDown className="w-4 h-4 text-[#666] group-hover:text-[#888] shrink-0 mt-0.5 transition-colors" />
                          }
                        </button>
                        {isExpanded && (
                          <div className="px-5 pb-5 pt-0 border-t border-[#1a1a1a]">
                            <p className="text-sm text-[#999] pt-4 leading-relaxed">{item.a}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}

            {/* Contact section */}
            <section>
              <div className="p-6 rounded-xl bg-gradient-to-br from-blue-500/5 to-purple-500/5 border border-blue-500/20">
                <h3 className="text-base font-semibold text-[#fff] mb-2">Still have questions?</h3>
                <p className="text-sm text-[#999] leading-relaxed">
                  Reach out to us at{' '}
                  <a href="mailto:support@tabkeep.app" className="text-blue-400 hover:text-blue-300 transition-colors font-medium">
                    support@tabkeep.app
                  </a>{' '}
                  and we'll get back to you.
                </p>
              </div>
            </section>

            {/* Navigation to Documentation */}
            <section>
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-[#e5e5e5]">Explore More</h3>
              </div>
              <Link
                to="/docs"
                className="flex items-center justify-between p-6 rounded-xl bg-[#141414] border border-[#202020] hover:border-[#282828] hover:bg-[#181818] transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-[#1a1a1a] group-hover:bg-[#1f1f1f] transition-colors">
                    <FileText className="w-6 h-6 text-[#888] group-hover:text-blue-400 transition-colors" />
                  </div>
                  <div>
                    <p className="text-[#e5e5e5] font-semibold group-hover:text-blue-400 transition-colors">Documentation</p>
                    <p className="text-sm text-[#666] mt-0.5">Learn how to use TabKeep</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-[#444] group-hover:text-[#888] transition-colors" />
              </Link>
            </section>

            {/* Bottom spacer */}
            <div className="h-24" />
          </div>
        </main>
      </div>
    </div>
  );
};

export default FAQ;
