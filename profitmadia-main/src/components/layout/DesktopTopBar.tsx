import { Search, X } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Bell } from "lucide-react";

export const DesktopTopBar = () => {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/discover?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-30 h-14 bg-background/80 backdrop-blur-xl border-b border-border/20 flex items-center gap-4 px-6">
      {/* Search */}
      <form onSubmit={handleSearch} className="flex-1 max-w-md relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search videos, creators, sounds..."
          className="pl-9 pr-8 h-9 bg-muted/50 border-border/30 rounded-full text-sm"
        />
        {query && (
          <button type="button" onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}
      </form>

      <div className="flex items-center gap-2">
        <button aria-label="Notifications" className="p-2 rounded-full hover:bg-muted/60 transition-colors relative">
          <Bell className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>
    </header>
  );
};
