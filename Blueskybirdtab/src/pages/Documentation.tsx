import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Brain,
  Sparkles,
  MessageSquare,
  Zap,
  Keyboard,
  UserCog,
  Shield,
  BookOpen,
  Search,
  Code,
  Layers,
  ChevronRight,
  FileText,
} from 'lucide-react';

const sections = [
  { id: 'getting-started', label: 'Getting Started', icon: BookOpen },
  { id: 'chat-interface', label: 'Chat Interface', icon: MessageSquare },
  { id: 'memory-anchors', label: 'Memory Anchors', icon: Brain },
  { id: 'plans-usage', label: 'Plans & Usage', icon: Zap },
  { id: 'search-modes', label: 'Search Modes', icon: Search },
  { id: 'code-preview', label: 'Code Preview', icon: Code },
  { id: 'keyboard-shortcuts', label: 'Keyboard Shortcuts', icon: Keyboard },
  { id: 'account', label: 'Account Management', icon: UserCog },
  { id: 'privacy', label: 'Privacy & Data', icon: Shield },
];

const Documentation = () => {
  const [activeSection, setActiveSection] = useState('getting-started');
  const contentRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  // IntersectionObserver for scroll-based active section tracking
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveSection(visible[0].target.id);
        }
      },
      {
        root: contentRef.current,
        rootMargin: '-10% 0px -70% 0px',
        threshold: 0,
      }
    );

    sections.forEach(({ id }) => {
      const el = sectionRefs.current[id];
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: string) => {
    const el = sectionRefs.current[id];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const setSectionRef = (id: string) => (el: HTMLElement | null) => {
    sectionRefs.current[id] = el;
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-[#e5e5e5] flex flex-col">
      {/* Header */}
      <header className="flex items-center px-8 py-4 border-b border-[#1f1f1f] bg-[#0a0a0a]/80 backdrop-blur-sm shrink-0 sticky top-0 z-50">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 group-hover:border-blue-400/50 transition-colors">
            <Layers className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <div className="text-xs text-[#666] uppercase tracking-wide font-medium">TabKeep</div>
            <div className="text-sm font-semibold text-[#e5e5e5] -mt-0.5">Documentation</div>
          </div>
        </Link>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <nav className="w-64 shrink-0 border-r border-[#1f1f1f] py-8 px-4 overflow-y-auto bg-[#0a0a0a]">
          <div className="mb-6">
            <h3 className="px-3 text-[11px] uppercase tracking-widest text-[#555] font-semibold mb-3">Contents</h3>
          </div>
          <ul className="space-y-1">
            {sections.map(({ id, label, icon: Icon }) => (
              <li key={id}>
                <button
                  onClick={() => scrollToSection(id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group ${
                    activeSection === id
                      ? 'bg-[#1a1a1a] text-[#fff] border-l-[3px] border-blue-500 pl-[9px]'
                      : 'text-[#888] hover:text-[#e5e5e5] hover:bg-[#141414] border-l-[3px] border-transparent'
                  }`}
                >
                  <Icon className={`w-[18px] h-[18px] shrink-0 transition-colors ${
                    activeSection === id ? 'text-blue-400' : 'text-[#555] group-hover:text-[#888]'
                  }`} />
                  <span className="truncate font-medium">{label}</span>
                  {activeSection === id && <ChevronRight className="w-3.5 h-3.5 ml-auto text-blue-400" />}
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-10 pt-6 border-t border-[#1f1f1f]">
            <p className="px-3 text-[11px] uppercase tracking-widest text-[#555] font-semibold mb-3">Other Pages</p>
            <Link
              to="/faq"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#888] hover:text-[#e5e5e5] hover:bg-[#141414] transition-all group"
            >
              <MessageSquare className="w-[18px] h-[18px] text-[#555] group-hover:text-[#888]" />
              <span className="font-medium">FAQ</span>
              <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          </div>
        </nav>

        {/* Content */}
        <main ref={contentRef} className="flex-1 overflow-y-auto px-12 py-12 bg-[#0f0f0f]">
          <div className="max-w-3xl mx-auto space-y-20">

            {/* Getting Started */}
            <section id="getting-started" ref={setSectionRef('getting-started')}>
              <div className="mb-8">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 mb-4">
                  <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-[11px] uppercase tracking-wider text-blue-400 font-semibold">Getting Started</span>
                </div>
                <h2 className="text-3xl font-bold text-[#fff] mb-3 tracking-tight">Getting Started</h2>
                <p className="text-base text-[#999] leading-relaxed">
                  Welcome to TabKeep. A smarter way to chat with AI that remembers who you are.
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-6 rounded-xl bg-[#141414] border border-[#202020] hover:border-[#282828] transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 font-semibold text-sm">
                      1
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-[#fff] mb-2">Create an account</h3>
                      <p className="text-sm text-[#999] leading-relaxed">
                        Sign up with your email to get started. Your account gives you access to the free plan with 100 intelligence units per month, a personal memory anchor, and full chat history.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-xl bg-[#141414] border border-[#202020] hover:border-[#282828] transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 font-semibold text-sm">
                      2
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-[#fff] mb-2">Start a conversation</h3>
                      <p className="text-sm text-[#999] leading-relaxed">
                        Type a message in the search bar to start chatting. TabKeep uses advanced AI models including Claude and GPT-5 to provide the best response for your query. The system automatically routes your request to the most appropriate model.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-xl bg-[#141414] border border-[#202020] hover:border-[#282828] transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 font-semibold text-sm">
                      3
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-[#fff] mb-2">Explore the sidebar</h3>
                      <p className="text-sm text-[#999] leading-relaxed">
                        Your chat history lives in the left sidebar. Click any previous conversation to resume it. You can rename or delete chats at any time.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Chat Interface */}
            <section id="chat-interface" ref={setSectionRef('chat-interface')}>
              <div className="mb-8">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-purple-500/10 border border-purple-500/20 mb-4">
                  <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-[11px] uppercase tracking-wider text-purple-400 font-semibold">Chat Interface</span>
                </div>
                <h2 className="text-3xl font-bold text-[#fff] mb-3 tracking-tight">Chat Interface</h2>
                <p className="text-base text-[#999] leading-relaxed">
                  The chat interface is designed for natural conversation with powerful built-in features.
                </p>
              </div>

              <div className="grid gap-4">
                <div className="p-6 rounded-xl bg-[#141414] border border-[#202020] hover:border-[#282828] transition-colors">
                  <h3 className="text-base font-semibold text-[#fff] mb-2.5 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                    Streaming responses
                  </h3>
                  <p className="text-sm text-[#999] leading-relaxed">
                    Responses stream in real-time as the AI generates them. You can see the AI's thought process unfold with a live typing indicator.
                  </p>
                </div>

                <div className="p-6 rounded-xl bg-[#141414] border border-[#202020] hover:border-[#282828] transition-colors">
                  <h3 className="text-base font-semibold text-[#fff] mb-2.5 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                    Image & video attachments
                  </h3>
                  <p className="text-sm text-[#999] leading-relaxed">
                    Attach images or videos directly to your messages. The AI can analyze visual content, extract text, describe images, and discuss what it sees.
                  </p>
                </div>

                <div className="p-6 rounded-xl bg-[#141414] border border-[#202020] hover:border-[#282828] transition-colors">
                  <h3 className="text-base font-semibold text-[#fff] mb-2.5 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                    Smart model routing
                  </h3>
                  <p className="text-sm text-[#999] leading-relaxed">
                    TabKeep automatically selects the best AI model for your query. Complex coding and analysis goes to Claude with extended thinking. Real-time queries about current events route to GPT-5.
                  </p>
                </div>

                <div className="p-6 rounded-xl bg-[#141414] border border-[#202020] hover:border-[#282828] transition-colors">
                  <h3 className="text-base font-semibold text-[#fff] mb-2.5 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                    Message reactions
                  </h3>
                  <p className="text-sm text-[#999] leading-relaxed">
                    Thumbs up or thumbs down any AI response. Your feedback helps the memory system learn what works and what doesn't, improving future responses.
                  </p>
                </div>
              </div>
            </section>

            {/* Memory Anchors */}
            <section id="memory-anchors" ref={setSectionRef('memory-anchors')}>
              <div className="mb-8">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 mb-4">
                  <Brain className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[11px] uppercase tracking-wider text-emerald-400 font-semibold">Memory Anchors</span>
                </div>
                <h2 className="text-3xl font-bold text-[#fff] mb-3 tracking-tight">Memory Anchors</h2>
                <p className="text-base text-[#999] leading-relaxed">
                  Memory Anchors are persistent AI brains that remember you across conversations.
                </p>
              </div>

              <div className="p-6 rounded-xl bg-gradient-to-br from-emerald-500/5 to-blue-500/5 border border-emerald-500/20 mb-6">
                <div className="flex items-start gap-3">
                  <Brain className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                  <p className="text-sm text-[#aaa] leading-relaxed">
                    <span className="text-[#fff] font-semibold">Important:</span> When you delete a chat, your memories persist. Memory Anchors are separate from chat history -- they're your AI's long-term knowledge about you.
                  </p>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="p-6 rounded-xl bg-[#141414] border border-[#202020] hover:border-[#282828] transition-colors">
                  <h3 className="text-base font-semibold text-[#fff] mb-2.5 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    How memories work
                  </h3>
                  <p className="text-sm text-[#999] leading-relaxed">
                    Memories are facts, preferences, and patterns that the AI stores about you. They're injected into every conversation so the AI always knows your context. You can add memories manually or let the AI extract them from your conversations automatically.
                  </p>
                </div>

                <div className="p-6 rounded-xl bg-[#141414] border border-[#202020] hover:border-[#282828] transition-colors">
                  <h3 className="text-base font-semibold text-[#fff] mb-2.5 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    Managing memories
                  </h3>
                  <p className="text-sm text-[#999] leading-relaxed">
                    Go to <code className="px-1.5 py-0.5 rounded bg-[#1a1a1a] text-emerald-400 text-xs font-mono">Settings &gt; Memory</code> to view, add, edit, or delete individual memories. Each memory shows its source (user-added or learned), type, and creation date. You can clear all memories at any time.
                  </p>
                </div>

                <div className="p-6 rounded-xl bg-[#141414] border border-[#202020] hover:border-[#282828] transition-colors">
                  <h3 className="text-base font-semibold text-[#fff] mb-2.5 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    Auto-extraction
                  </h3>
                  <p className="text-sm text-[#999] leading-relaxed">
                    After meaningful conversations (4+ messages), TabKeep automatically analyzes the chat and extracts key learnings -- your preferences, communication style, and important facts. These are stored as "Learned" memories.
                  </p>
                </div>

                <div className="p-6 rounded-xl bg-[#141414] border border-[#202020] hover:border-[#282828] transition-colors">
                  <h3 className="text-base font-semibold text-[#fff] mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    Memory types
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <span className="text-[10px] px-2 py-1 rounded bg-blue-500/10 text-blue-400 shrink-0 font-mono uppercase tracking-wide border border-blue-500/20">preference</span>
                      <span className="text-sm text-[#888] leading-relaxed">What you prefer or like (e.g., concise responses)</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-[10px] px-2 py-1 rounded bg-purple-500/10 text-purple-400 shrink-0 font-mono uppercase tracking-wide border border-purple-500/20">fact</span>
                      <span className="text-sm text-[#888] leading-relaxed">Factual info about you (e.g., your location, role)</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-[10px] px-2 py-1 rounded bg-amber-500/10 text-amber-400 shrink-0 font-mono uppercase tracking-wide border border-amber-500/20">style</span>
                      <span className="text-sm text-[#888] leading-relaxed">How you like to communicate (e.g., casual tone)</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Plans & Usage */}
            <section id="plans-usage" ref={setSectionRef('plans-usage')}>
              <div className="mb-8">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 mb-4">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[11px] uppercase tracking-wider text-amber-400 font-semibold">Plans & Usage</span>
                </div>
                <h2 className="text-3xl font-bold text-[#fff] mb-3 tracking-tight">Plans & Usage</h2>
                <p className="text-base text-[#999] leading-relaxed">
                  TabKeep offers three plans to match your needs.
                </p>
              </div>

              <div className="grid gap-4">
                <div className="p-6 rounded-xl bg-[#141414] border border-[#202020] hover:border-[#282828] transition-colors">
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-base font-semibold text-[#fff]">Free</h3>
                  </div>
                  <p className="text-sm text-[#999] leading-relaxed">
                    100 intelligence units per month. 1 memory anchor. Memory context in all conversations. Resets monthly.
                  </p>
                </div>

                <div className="p-6 rounded-xl bg-gradient-to-br from-amber-500/5 to-orange-500/5 border border-amber-500/20 hover:border-amber-500/30 transition-colors">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <h3 className="text-base font-semibold text-amber-400">Pro — $20/month</h3>
                  </div>
                  <p className="text-sm text-[#999] leading-relaxed">
                    500 intelligence units with 3-hour cooldown resets. Up to 5 memory anchors. Cross-chat memory. Priority responses.
                  </p>
                </div>

                <div className="p-6 rounded-xl bg-gradient-to-br from-purple-500/5 to-pink-500/5 border border-purple-500/20 hover:border-purple-500/30 transition-colors">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <h3 className="text-base font-semibold text-purple-400">Max — $200/month</h3>
                  </div>
                  <p className="text-sm text-[#999] leading-relaxed">
                    Unlimited intelligence. Unlimited memory anchors. Extended memory (50 memories per anchor). Fastest response times. Advanced image analysis.
                  </p>
                </div>

                <div className="p-6 rounded-xl bg-[#141414] border border-[#202020] hover:border-[#282828] transition-colors">
                  <h3 className="text-base font-semibold text-[#fff] mb-2.5 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    Intelligence units
                  </h3>
                  <p className="text-sm text-[#999] leading-relaxed">
                    Each message costs intelligence units based on complexity. Simple questions cost 1-2 units. Complex coding or analysis with extended thinking can cost up to 20 units. Track your usage in <code className="px-1.5 py-0.5 rounded bg-[#1a1a1a] text-amber-400 text-xs font-mono">Settings &gt; Usage</code>.
                  </p>
                </div>
              </div>
            </section>

            {/* Search Modes */}
            <section id="search-modes" ref={setSectionRef('search-modes')}>
              <div className="mb-8">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/20 mb-4">
                  <Search className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-[11px] uppercase tracking-wider text-cyan-400 font-semibold">Search Modes</span>
                </div>
                <h2 className="text-3xl font-bold text-[#fff] mb-3 tracking-tight">Search Modes</h2>
                <p className="text-base text-[#999] leading-relaxed">
                  TabKeep automatically detects the best mode for your query.
                </p>
              </div>

              <div className="grid gap-4">
                <div className="p-6 rounded-xl bg-[#141414] border border-[#202020] hover:border-[#282828] transition-colors">
                  <h3 className="text-base font-semibold text-[#fff] mb-2.5 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                    Search mode
                  </h3>
                  <p className="text-sm text-[#999] leading-relaxed">
                    Triggered on first messages and build/create requests. Treats the query as a fresh request. If you mention a website, TabKeep assumes you want to build something similar.
                  </p>
                </div>

                <div className="p-6 rounded-xl bg-[#141414] border border-[#202020] hover:border-[#282828] transition-colors">
                  <h3 className="text-base font-semibold text-[#fff] mb-2.5 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                    Chat mode
                  </h3>
                  <p className="text-sm text-[#999] leading-relaxed">
                    Activates during follow-up messages. References previous conversation context for natural, continuous dialogue.
                  </p>
                </div>

                <div className="p-6 rounded-xl bg-[#141414] border border-[#202020] hover:border-[#282828] transition-colors">
                  <h3 className="text-base font-semibold text-[#fff] mb-2.5 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                    Deep analysis mode
                  </h3>
                  <p className="text-sm text-[#999] leading-relaxed">
                    Triggered by phrases like "explain in detail" or "deep dive." Provides comprehensive, thorough responses with extended reasoning.
                  </p>
                </div>
              </div>
            </section>

            {/* Code Preview */}
            <section id="code-preview" ref={setSectionRef('code-preview')}>
              <div className="mb-8">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-pink-500/10 border border-pink-500/20 mb-4">
                  <Code className="w-3.5 h-3.5 text-pink-400" />
                  <span className="text-[11px] uppercase tracking-wider text-pink-400 font-semibold">Code Preview</span>
                </div>
                <h2 className="text-3xl font-bold text-[#fff] mb-3 tracking-tight">Code Preview</h2>
                <p className="text-base text-[#999] leading-relaxed">
                  When the AI generates code, TabKeep can render it live.
                </p>
              </div>

              <div className="grid gap-4">
                <div className="p-6 rounded-xl bg-[#141414] border border-[#202020] hover:border-[#282828] transition-colors">
                  <h3 className="text-base font-semibold text-[#fff] mb-2.5 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-pink-400"></span>
                    Live preview sidebar
                  </h3>
                  <p className="text-sm text-[#999] leading-relaxed">
                    When the AI generates HTML, CSS, or JavaScript code, a preview sidebar automatically opens on the right side. You can see your code running in real-time as the AI streams it.
                  </p>
                </div>

                <div className="p-6 rounded-xl bg-[#141414] border border-[#202020] hover:border-[#282828] transition-colors">
                  <h3 className="text-base font-semibold text-[#fff] mb-2.5 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-pink-400"></span>
                    Copy code blocks
                  </h3>
                  <p className="text-sm text-[#999] leading-relaxed">
                    Every code block has a copy button in the top-right corner. Click it to copy the code to your clipboard. Supported languages are automatically detected and syntax-highlighted.
                  </p>
                </div>
              </div>
            </section>

            {/* Keyboard Shortcuts */}
            <section id="keyboard-shortcuts" ref={setSectionRef('keyboard-shortcuts')}>
              <div className="mb-8">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 mb-4">
                  <Keyboard className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-[11px] uppercase tracking-wider text-indigo-400 font-semibold">Keyboard Shortcuts</span>
                </div>
                <h2 className="text-3xl font-bold text-[#fff] mb-3 tracking-tight">Keyboard Shortcuts</h2>
                <p className="text-base text-[#999] leading-relaxed">
                  Navigate TabKeep faster with keyboard shortcuts.
                </p>
              </div>

              <div className="p-6 rounded-xl bg-[#141414] border border-[#202020]">
                <div className="space-y-4">
                  {[
                    { keys: 'Enter', desc: 'Send message' },
                    { keys: 'Shift + Enter', desc: 'New line in message' },
                    { keys: 'Esc', desc: 'Stop generation / Close modal' },
                    { keys: '/', desc: 'Focus search bar' },
                  ].map(({ keys, desc }) => (
                    <div key={keys} className="flex items-center justify-between py-2 border-b border-[#1a1a1a] last:border-0">
                      <span className="text-sm text-[#aaa]">{desc}</span>
                      <kbd className="px-3 py-1.5 rounded-lg bg-[#1a1a1a] border border-[#282828] text-xs text-[#ccc] font-mono shadow-sm">{keys}</kbd>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-[#555] mt-6 pt-4 border-t border-[#1a1a1a]">More shortcuts coming soon.</p>
              </div>
            </section>

            {/* Account Management */}
            <section id="account" ref={setSectionRef('account')}>
              <div className="mb-8">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-orange-500/10 border border-orange-500/20 mb-4">
                  <UserCog className="w-3.5 h-3.5 text-orange-400" />
                  <span className="text-[11px] uppercase tracking-wider text-orange-400 font-semibold">Account Management</span>
                </div>
                <h2 className="text-3xl font-bold text-[#fff] mb-3 tracking-tight">Account Management</h2>
                <p className="text-base text-[#999] leading-relaxed">
                  Manage your profile, security, and preferences.
                </p>
              </div>

              <div className="grid gap-4">
                <div className="p-6 rounded-xl bg-[#141414] border border-[#202020] hover:border-[#282828] transition-colors">
                  <h3 className="text-base font-semibold text-[#fff] mb-2.5 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
                    Profile settings
                  </h3>
                  <p className="text-sm text-[#999] leading-relaxed">
                    Update your display name, username, and avatar in <code className="px-1.5 py-0.5 rounded bg-[#1a1a1a] text-orange-400 text-xs font-mono">Settings &gt; Account</code>. Your email address is set during signup and cannot be changed.
                  </p>
                </div>

                <div className="p-6 rounded-xl bg-[#141414] border border-[#202020] hover:border-[#282828] transition-colors">
                  <h3 className="text-base font-semibold text-[#fff] mb-2.5 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
                    Password
                  </h3>
                  <p className="text-sm text-[#999] leading-relaxed">
                    Change your password anytime from Settings &gt; Account &gt; Change Password. Passwords must be at least 6 characters.
                  </p>
                </div>

                <div className="p-6 rounded-xl bg-[#141414] border border-[#202020] hover:border-[#282828] transition-colors">
                  <h3 className="text-base font-semibold text-[#fff] mb-2.5 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
                    Delete account
                  </h3>
                  <p className="text-sm text-[#999] leading-relaxed">
                    You can permanently delete your account and all associated data from Settings &gt; Delete Account. This action is irreversible. Type "DELETE" to confirm.
                  </p>
                </div>
              </div>
            </section>

            {/* Privacy & Data */}
            <section id="privacy" ref={setSectionRef('privacy')}>
              <div className="mb-8">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-red-500/10 border border-red-500/20 mb-4">
                  <Shield className="w-3.5 h-3.5 text-red-400" />
                  <span className="text-[11px] uppercase tracking-wider text-red-400 font-semibold">Privacy & Data</span>
                </div>
                <h2 className="text-3xl font-bold text-[#fff] mb-3 tracking-tight">Privacy & Data</h2>
                <p className="text-base text-[#999] leading-relaxed">
                  Your privacy matters. Here's how TabKeep handles your data.
                </p>
              </div>

              <div className="grid gap-4">
                <div className="p-6 rounded-xl bg-[#141414] border border-[#202020] hover:border-[#282828] transition-colors">
                  <h3 className="text-base font-semibold text-[#fff] mb-2.5 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                    What we store
                  </h3>
                  <p className="text-sm text-[#999] leading-relaxed">
                    Account info (email, name, avatar), chat history, and AI memories. Usage analytics are anonymized. We do not sell your data to third parties.
                  </p>
                </div>

                <div className="p-6 rounded-xl bg-[#141414] border border-[#202020] hover:border-[#282828] transition-colors">
                  <h3 className="text-base font-semibold text-[#fff] mb-2.5 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                    Your rights
                  </h3>
                  <p className="text-sm text-[#999] leading-relaxed">
                    You can access, export, correct, or delete your data at any time. See <code className="px-1.5 py-0.5 rounded bg-[#1a1a1a] text-red-400 text-xs font-mono">Settings &gt; Privacy</code> for full details.
                  </p>
                </div>

                <div className="p-6 rounded-xl bg-[#141414] border border-[#202020] hover:border-[#282828] transition-colors">
                  <h3 className="text-base font-semibold text-[#fff] mb-2.5 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                    AI conversations
                  </h3>
                  <p className="text-sm text-[#999] leading-relaxed">
                    Your conversations are processed by AI providers (Anthropic, OpenAI) to generate responses. Memories are stored in your secure database and only accessible to you.
                  </p>
                </div>
              </div>

              <p className="text-xs text-[#555] mt-8 pt-6 border-t border-[#1a1a1a]">
                Last updated: January 2026 &middot; Contact <a href="mailto:privacy@tabkeep.app" className="text-red-400 hover:text-red-300 transition-colors">privacy@tabkeep.app</a> for questions
              </p>
            </section>

            {/* Navigation to FAQ */}
            <section>
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-[#e5e5e5]">Explore More</h3>
              </div>
              <Link
                to="/faq"
                className="flex items-center justify-between p-6 rounded-xl bg-[#141414] border border-[#202020] hover:border-[#282828] hover:bg-[#181818] transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-[#1a1a1a] group-hover:bg-[#1f1f1f] transition-colors">
                    <MessageSquare className="w-6 h-6 text-[#888] group-hover:text-blue-400 transition-colors" />
                  </div>
                  <div>
                    <p className="text-[#e5e5e5] font-semibold group-hover:text-blue-400 transition-colors">FAQ</p>
                    <p className="text-sm text-[#666] mt-0.5">Frequently asked questions</p>
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

export default Documentation;
