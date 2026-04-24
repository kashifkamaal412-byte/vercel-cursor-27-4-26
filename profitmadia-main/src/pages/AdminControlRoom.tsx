import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Send, 
  Bot, 
  User, 
  Shield, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2,
  ArrowLeft,
  Activity,
  Bell,
  ListTodo,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Alert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  is_resolved: boolean;
  created_at: string;
}

interface Task {
  id: string;
  task_name: string;
  description: string;
  is_active: boolean;
  last_run_at: string | null;
  created_at: string;
}

const AdminControlRoom = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Check admin status
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }

      // Use raw query to avoid type issues with new tables
      const { data, error } = await supabase
        .from('user_roles' as any)
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
        return;
      }

      setIsAdmin(!!data);
    };

    if (!authLoading) {
      checkAdminStatus();
    }
  }, [user, authLoading]);

  // Load chat history, alerts, and tasks
  useEffect(() => {
    if (isAdmin) {
      loadChatHistory();
      loadAlerts();
      loadTasks();
    }
  }, [isAdmin]);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadChatHistory = async () => {
    const { data } = await supabase
      .from('admin_chat_messages' as any)
      .select('*')
      .order('created_at', { ascending: true })
      .limit(50);

    if (data) {
      setMessages((data as any[]).map((msg: any) => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: new Date(msg.created_at)
      })));
    }
  };

  const loadAlerts = async () => {
    const { data } = await supabase
      .from('ai_alerts' as any)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) {
      setAlerts(data as unknown as Alert[]);
    }
  };

  const loadTasks = async () => {
    const { data } = await supabase
      .from('ai_tasks' as any)
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      setTasks(data as unknown as Task[]);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const conversationHistory = messages.slice(-10).map(m => ({
        role: m.role,
        content: m.content
      }));

      const { data, error } = await supabase.functions.invoke('admin-gemini', {
        body: { 
          message: inputMessage,
          conversationHistory
        }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Refresh alerts if new ones were created
      loadAlerts();

    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Failed to get response');
    } finally {
      setIsLoading(false);
    }
  };

  const resolveAlert = async (alertId: string) => {
    const { error } = await supabase
      .from('ai_alerts' as any)
      .update({ is_resolved: true, resolved_at: new Date().toISOString() })
      .eq('id', alertId);

    if (!error) {
      toast.success('Alert resolved');
      loadAlerts();
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };

  // Loading state
  if (authLoading || isAdmin === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not authorized
  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Shield className="w-16 h-16 mx-auto text-destructive mb-4" />
            <h1 className="text-xl font-bold mb-2">Access Denied</h1>
            <p className="text-muted-foreground mb-4">
              This area is restricted to administrators only.
            </p>
            <Button onClick={() => navigate('/')} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <h1 className="text-lg font-bold">Admin AI Control Room</h1>
          </div>
          <Badge variant="outline" className="ml-auto">
            <Bot className="w-3 h-3 mr-1" />
            GEMINI Online
          </Badge>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        <Tabs defaultValue="chat" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <Bot className="w-4 h-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Alerts
              {alerts.filter(a => !a.is_resolved).length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                  {alerts.filter(a => !a.is_resolved).length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex items-center gap-2">
              <ListTodo className="w-4 h-4" />
              Tasks
            </TabsTrigger>
          </TabsList>

          {/* Chat Tab */}
          <TabsContent value="chat" className="space-y-4">
            <Card className="h-[calc(100vh-280px)]">
              <ScrollArea className="h-full p-4" ref={scrollRef}>
                <div className="space-y-4">
                  {/* Welcome message */}
                  {messages.length === 0 && (
                    <div className="text-center py-8">
                      <Bot className="w-16 h-16 mx-auto text-primary mb-4" />
                      <h2 className="text-xl font-bold mb-2">Welcome, Admin</h2>
                      <p className="text-muted-foreground max-w-md mx-auto">
                        I am GEMINI, your AI Security & Engineering Assistant. 
                        I monitor your app 24/7 and can help with any issues.
                      </p>
                      <div className="mt-4 flex flex-wrap justify-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setInputMessage("App ki health check karo")}
                        >
                          Health Check
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setInputMessage("Fake accounts detect karo")}
                        >
                          Detect Fakes
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setInputMessage("Recent bugs ya issues batao")}
                        >
                          Find Bugs
                        </Button>
                      </div>
                    </div>
                  )}

                  <AnimatePresence>
                    {messages.map((message) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {message.role === 'assistant' && (
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                            <Bot className="w-4 h-4 text-primary" />
                          </div>
                        )}
                        <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                          message.role === 'user' 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted'
                        }`}>
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          <p className="text-[10px] opacity-60 mt-1">
                            {message.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                        {message.role === 'user' && (
                          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                            <User className="w-4 h-4 text-primary-foreground" />
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {isLoading && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-primary" />
                      </div>
                      <div className="bg-muted rounded-2xl px-4 py-2.5">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" />
                          <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce delay-100" />
                          <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce delay-200" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </Card>

            {/* Input */}
            <div className="flex gap-2">
              <Input
                placeholder="Ask GEMINI anything about your app..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                className="flex-1"
                disabled={isLoading}
              />
              <Button onClick={sendMessage} disabled={isLoading || !inputMessage.trim()}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">AI Alerts</h2>
              <Button variant="outline" size="sm" onClick={loadAlerts}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>

            {alerts.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <CheckCircle2 className="w-12 h-12 mx-auto text-green-500 mb-3" />
                  <p className="text-muted-foreground">No alerts. Everything looks good!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <Card key={alert.id} className={alert.is_resolved ? 'opacity-60' : ''}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-2 ${getSeverityColor(alert.severity)}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium">{alert.title}</h3>
                            <Badge variant="outline" className="text-xs">
                              {alert.severity}
                            </Badge>
                            {alert.is_resolved && (
                              <Badge variant="secondary" className="text-xs">
                                Resolved
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {alert.description}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(alert.created_at).toLocaleString()}
                          </p>
                        </div>
                        {!alert.is_resolved && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => resolveAlert(alert.id)}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Monitoring Tasks</h2>
              <Button variant="outline" size="sm" onClick={loadTasks}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>

            {tasks.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <ListTodo className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No active tasks.</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Ask GEMINI to start monitoring something!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <Card key={task.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Activity className={`w-5 h-5 ${task.is_active ? 'text-green-500' : 'text-muted-foreground'}`} />
                        <div className="flex-1">
                          <h3 className="font-medium">{task.task_name}</h3>
                          <p className="text-sm text-muted-foreground">{task.description}</p>
                        </div>
                        <Badge variant={task.is_active ? "default" : "secondary"}>
                          {task.is_active ? 'Active' : 'Paused'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminControlRoom;
