import { ExternalLink, Globe, Clock } from 'lucide-react';

interface WebResult {
  title: string;
  url: string;
  snippet: string;
  favicon?: string | null;
  age?: string | null;
}

interface NewsResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  thumbnail?: string | null;
  age?: string;
}

interface WebSearchResultsProps {
  query: string;
  results: WebResult[];
  news?: NewsResult[];
}

const WebSearchResults = ({ query, results, news }: WebSearchResultsProps) => {
  if (results.length === 0) return null;

  return (
    <div className="space-y-6 mt-8">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Globe size={16} />
        <span>Web Results for "{query}"</span>
      </div>

      {/* News Results */}
      {news && news.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">Top Stories</h3>
          <div className="grid gap-3">
            {news.map((item, idx) => (
              <a
                key={idx}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 border border-border/50 hover:border-border transition-all group"
              >
                {item.thumbnail && (
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    className="w-24 h-16 object-cover rounded flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
                    {item.title}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {item.snippet}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <span>{item.source}</span>
                    {item.age && (
                      <>
                        <span>•</span>
                        <span>{item.age}</span>
                      </>
                    )}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Web Results */}
      <div className="space-y-4">
        {results.map((result, idx) => (
          <a
            key={idx}
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block group"
          >
            <div className="flex items-start gap-3">
              {/* Favicon */}
              {result.favicon ? (
                <img
                  src={result.favicon}
                  alt=""
                  className="w-5 h-5 mt-0.5 rounded flex-shrink-0"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <Globe size={16} className="text-muted-foreground mt-1 flex-shrink-0" />
              )}

              <div className="flex-1 min-w-0">
                {/* Title */}
                <h3 className="text-lg font-medium text-primary group-hover:underline line-clamp-2">
                  {result.title}
                </h3>

                {/* URL */}
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-sm text-green-600 dark:text-green-400">
                    {new URL(result.url).hostname}
                  </span>
                  <ExternalLink size={12} className="text-muted-foreground" />
                </div>

                {/* Snippet */}
                <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
                  {result.snippet}
                </p>

                {/* Age */}
                {result.age && (
                  <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground/70">
                    <Clock size={12} />
                    <span>{result.age}</span>
                  </div>
                )}
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

export default WebSearchResults;
