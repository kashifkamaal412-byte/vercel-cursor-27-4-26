import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Search, UserPlus, Check } from "lucide-react";

interface InviteModalProps {
  open: boolean;
  onClose: () => void;
  onInvite: (user: string) => void;
  existingParticipants: string[];
}

const mockUsers = ["Ali Raza", "Sara", "Hamza", "Zoya", "Usman", "Rehan", "Bilal", "Fatima", "Omar", "Hina"];

export const InviteModal = ({ open, onClose, onInvite, existingParticipants }: InviteModalProps) => {
  const [search, setSearch] = useState("");
  const [invited, setInvited] = useState<Record<string, boolean>>({});

  const filteredUsers = mockUsers.filter(
    (user) =>
      user.toLowerCase().includes(search.toLowerCase()) && !existingParticipants.includes(user) && !invited[user],
  );

  const handleInvite = (user: string) => {
    setInvited((prev) => ({ ...prev, [user]: true }));
    onInvite(user);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="bg-background w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Invite to Live</h2>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users..."
                className="pl-9"
                autoFocus
              />
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredUsers.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No users found</p>
              ) : (
                filteredUsers.map((user) => (
                  <div key={user} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <UserPlus className="w-4 h-4 text-primary" />
                      </div>
                      <span>{user}</span>
                    </div>
                    <Button size="sm" onClick={() => handleInvite(user)} className="bg-primary text-primary-foreground">
                      Invite
                    </Button>
                  </div>
                ))
              )}
            </div>

            {Object.keys(invited).length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">Invited</p>
                <div className="space-y-2">
                  {Object.keys(invited).map((user) => (
                    <div key={user} className="flex items-center gap-3 text-muted-foreground">
                      <Check className="w-4 h-4 text-green-500" />
                      <span>{user}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
