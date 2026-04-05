import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Calendar, User, Eye } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import CommentSection from "@/components/comments/CommentSection";

interface Blog {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  image_url: string | null;
  category: string;
  author_name: string;
  author_id: string;
  created_at: string;
  published: boolean;
  views_count: number;
}

const BlogDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    loadBlog();
  }, [id]);

  const loadBlog = async () => {
    try {
      const { data, error } = await supabase
        .from("blogs")
        .select("*")
        .eq("id", id)
        .eq("published", true)
        .single();

      if (error) throw error;
      setBlog(data);

      // Increment view count after loading
      const currentViews = data.views_count || 0;
      await supabase
        .from("blogs")
        .update({ views_count: currentViews + 1 })
        .eq("id", id);
      
      // Update local state with incremented count
      setBlog(prev => prev ? { ...prev, views_count: currentViews + 1 } : null);
    } catch (error) {
      console.error("Error loading blog:", error);
      navigate("/blog");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 pt-24 pb-16">
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 pt-24 pb-16">
          <div className="text-center py-20">
            <p className="text-muted-foreground">Article non trouvé</p>
            <Button onClick={() => navigate("/blog")} className="mt-4">
              Retour au blog
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 pt-24 pb-16">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate("/blog")}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour au blog
          </Button>

          {blog.image_url && (
            <div className="relative h-80 md:h-96 rounded-xl overflow-hidden mb-8">
              <img
                src={blog.image_url}
                alt={blog.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
              <Badge className="absolute top-4 left-4">{blog.category}</Badge>
            </div>
          )}

          <article className="prose prose-lg dark:prose-invert max-w-none">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
              {blog.title}
            </h1>

            <div className="flex items-center gap-4 mb-8 not-prose">
              <Avatar>
                <AvatarFallback>{blog.author_name[0]}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {blog.author_name}
                </p>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(blog.created_at), "d MMMM yyyy", { locale: fr })}
                </p>
              </div>
              <div className="ml-auto flex items-center gap-2 text-muted-foreground">
                <Eye className="w-4 h-4" />
                <span>{blog.views_count || 0} vues</span>
              </div>
            </div>

            <div className="whitespace-pre-wrap leading-relaxed">
              {blog.content}
            </div>
          </article>

          {/* Comments Section */}
          <div className="mt-12">
            <CommentSection contentType="blog" contentId={blog.id} />
          </div>

          <Card className="mt-12 p-6 bg-gradient-to-r from-primary/10 to-accent/10">
            <h3 className="text-lg font-semibold mb-2">Envie de plus de contenu ?</h3>
            <p className="text-muted-foreground mb-4">
              Découvrez tous nos articles et restez informé des dernières actualités de Duel Music.
            </p>
            <Button onClick={() => navigate("/blog")}>
              Voir tous les articles
            </Button>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default BlogDetail;
