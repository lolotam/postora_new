import { useAuth } from "@/hooks/useAuth";
import {
  MakeHeader,
  MakeHero,
  MakeSetupSteps,
  MakeModules,
  MakeParameterReference,
} from "@/components/make";
import {
  PlatformCardsGrid,
  ApiEndpointsSection,
  PlatformSettingsCards,
  N8nFooter,
} from "@/components/n8n";

export default function MakeIntegration() {
  const { user } = useAuth();

  const downloadAllConfigs = () => {
    const files = [
      { path: '/make-com/base.json', name: 'postora-make-base.json' },
      { path: '/make-com/connection.json', name: 'postora-make-connection.json' },
      { path: '/make-com/modules/create-post.json', name: 'postora-make-create-post.json' },
      { path: '/make-com/modules/get-post-status.json', name: 'postora-make-get-post-status.json' },
      { path: '/make-com/modules/list-posts.json', name: 'postora-make-list-posts.json' },
      { path: '/make-com/modules/upload-media.json', name: 'postora-make-upload-media.json' },
      { path: '/make-com/modules/list-accounts.json', name: 'postora-make-list-accounts.json' },
    ];
    files.forEach((f) => {
      const link = document.createElement('a');
      link.href = f.path;
      link.download = f.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <MakeHeader isAuthenticated={!!user} />
      <MakeHero onDownloadAll={downloadAllConfigs} />
      <MakeSetupSteps />
      <MakeModules />

      <section className="container mx-auto px-6 py-16 border-t border-border">
        <h2 className="text-3xl font-bold text-center mb-4">Platform API Documentation</h2>
        <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
          Each platform has specific settings and requirements. Click a platform for detailed API documentation.
        </p>
        <PlatformCardsGrid />
      </section>

      <ApiEndpointsSection />
      <PlatformSettingsCards />
      <MakeParameterReference />
      <N8nFooter />
    </div>
  );
}
