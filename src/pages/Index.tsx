import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { BarChart3, Bell, BookOpen } from "lucide-react";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const navigate = useNavigate();
  const { user, signInWithGoogle } = useAuth();

  const features = [
    {
      icon: <BarChart3 className="w-8 h-8 text-primary" />,
      title: "Visual Strategy Builder",
      description: "Design, test, and deploy complex trading strategies using a simple, intuitive interface. No coding required.",
    },
    {
      icon: <Bell className="w-8 h-8 text-primary" />,
      title: "Real-Time Alerts",
      description: "Get instant notifications via Telegram and in-app alerts the moment your strategy conditions are met.",
    },
    {
      icon: <BookOpen className="w-8 h-8 text-primary" />,
      title: "Automated Trade Journal",
      description: "Automatically log every signal and trade. Analyze your performance with insightful metrics and charts.",
    },
  ];

  const handlePrimaryAction = () => {
    if (user) {
      navigate("/dashboard");
    } else {
      signInWithGoogle();
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">
        {/* Hero Section */}
        <section className="container py-24 sm:py-32 text-center">
          <div className="animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-6">
              Automate Your Trading Edge
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-10">
              Build, test, and deploy trading strategies without writing a single line of code. TradeRadar monitors the markets 24/7, so you don't have to.
            </p>
            <div className="flex justify-center gap-4">
              <Button size="lg" onClick={handlePrimaryAction}>
                {user ? "Go to Dashboard" : "Get Started"}
              </Button>
              <Button size="lg" variant="outline" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
                Explore Features
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="container py-24 sm:py-32 bg-muted/40 rounded-t-lg">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">Why Choose TradeRadar?</h2>
            <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
              Everything you need to systematize your trading and gain a competitive advantage.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="bg-background p-8 rounded-lg border text-center animate-fade-in-up"
                style={{ animationDelay: `${0.4 + index * 0.2}s` }}
              >
                <div className="inline-block bg-muted p-4 rounded-full mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-4">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How It Works Section */}
        <section className="container py-24 sm:py-32">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">Get Started in 3 Simple Steps</h2>
            <p className="text-muted-foreground mt-4">From idea to live signal in minutes.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="animate-fade-in-up" style={{ animationDelay: "0.6s" }}>
              <div className="text-5xl font-bold text-primary mb-4">1</div>
              <h3 className="text-xl font-bold mb-2">Create a Strategy</h3>
              <p className="text-muted-foreground">Use our visual editor to define your entry and exit conditions based on popular technical indicators.</p>
            </div>
            <div className="animate-fade-in-up" style={{ animationDelay: "0.8s" }}>
              <div className="text-5xl font-bold text-primary mb-4">2</div>
              <h3 className="text-xl font-bold mb-2">Activate Monitoring</h3>
              <p className="text-muted-foreground">Launch your strategy with one click. Our engine scans the markets for your setups 24/7.</p>
            </div>
            <div className="animate-fade-in-up" style={{ animationDelay: "1.0s" }}>
              <div className="text-5xl font-bold text-primary mb-4">3</div>
              <h3 className="text-xl font-bold mb-2">Receive Alerts</h3>
              <p className="text-muted-foreground">Get notified instantly when a trade setup occurs, so you never miss an opportunity.</p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Index;