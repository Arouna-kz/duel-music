import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Music2, LogIn } from "lucide-react";

interface AuthRequiredDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AuthRequiredDialog = ({ open, onOpenChange }: AuthRequiredDialogProps) => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader className="text-center items-center">
          <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center mx-auto mb-3">
            <Music2 className="w-8 h-8 text-primary-foreground" />
          </div>
          <DialogTitle className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Rejoignez l'aventure !
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground pt-2">
            Connectez-vous ou créez un compte pour accéder aux duels, lives, concerts, replays et bien plus encore !
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-4">
          <Button
            onClick={() => { onOpenChange(false); navigate("/auth"); }}
            className="w-full h-12 text-base bg-gradient-primary hover:shadow-glow transition-all"
          >
            <LogIn className="w-5 h-5 mr-2" />
            Se connecter / S'inscrire
          </Button>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground"
          >
            Continuer à explorer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
