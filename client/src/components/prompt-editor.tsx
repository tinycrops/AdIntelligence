import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDownIcon, ChevronUpIcon, RefreshCwIcon } from "lucide-react";

interface PromptEditorProps {
  onPromptChange: (prompt: string) => void;
  onGameTypeChange: (gameType: string) => void;
  gameType: string;
  disabled?: boolean;
}

const gameTypes = [
  { value: "league_of_legends", label: "League of Legends" },
  { value: "valorant", label: "Valorant" },
  { value: "fortnite", label: "Fortnite" },
  { value: "other", label: "Other" }
];

export default function PromptEditor({ 
  onPromptChange, 
  onGameTypeChange, 
  gameType,
  disabled = false 
}: PromptEditorProps) {
  const [prompt, setPrompt] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  
  // Fetch default prompt when game type changes
  useEffect(() => {
    fetchDefaultPrompt(gameType);
  }, [gameType]);
  
  const fetchDefaultPrompt = async (type: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/prompts/${type}`);
      if (!response.ok) {
        throw new Error("Failed to fetch prompt");
      }
      const data = await response.json();
      setPrompt(data.prompt);
      onPromptChange(data.prompt);
    } catch (error) {
      console.error("Error fetching prompt:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
    onPromptChange(e.target.value);
  };
  
  const handleGameTypeChange = (value: string) => {
    onGameTypeChange(value);
  };
  
  const handleResetPrompt = () => {
    fetchDefaultPrompt(gameType);
  };
  
  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="w-full"
    >
      <Card className="w-full">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-md">Analysis Settings</CardTitle>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                {isOpen ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
                {isOpen ? "Hide Settings" : "Show Settings"}
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>
        
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="gameType">Game Type</Label>
              <Select 
                value={gameType} 
                onValueChange={handleGameTypeChange}
                disabled={disabled}
              >
                <SelectTrigger id="gameType">
                  <SelectValue placeholder="Select game type" />
                </SelectTrigger>
                <SelectContent>
                  {gameTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="prompt">Analysis Prompt</Label>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleResetPrompt}
                  disabled={disabled || isLoading}
                >
                  <RefreshCwIcon className="h-3 w-3 mr-1" />
                  Reset Default
                </Button>
              </div>
              <Textarea
                id="prompt"
                placeholder="Loading prompt..."
                value={prompt}
                onChange={handlePromptChange}
                className="min-h-[200px] font-mono text-sm"
                disabled={disabled || isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Edit this prompt to customize how the AI analyzes the video. 
                <strong> Important:</strong> Keep the JSON response format intact for the system to work properly.
              </p>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
} 