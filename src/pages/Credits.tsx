import { ArrowLeft } from 'lucide-react';
import logo from '@/assets/logo.png';

interface CreditsProps { onBack: () => void; }

const developers = [
  'BEPPU, Ryan Kaito', 'VITORILLO, Nathan', 'BALATERO, Pompeii III',
  'ALFECHE, Ivan', 'BERSAMINA, Juan Manuel', 'ANINO, Christian Dave',
  'GAGNI, Daniel Ma. Ferrolo', 'CORNITO, Jether',
];

const techStack = [
  { category: 'Frontend', items: ['React', 'TypeScript', 'Tailwind CSS', 'Vite'] },
  { category: 'UI Components', items: ['Radix UI', 'Lucide Icons', 'shadcn/ui'] },
  { category: 'Backend & Database', items: ['Supabase (PostgreSQL)', 'Real-time Subscriptions', 'Row Level Security'] },
  { category: 'Data Visualization', items: ['Recharts', 'date-fns'] },
];

const Credits = ({ onBack }: CreditsProps) => (
  <div className="min-h-screen bg-background flex items-center justify-center p-8">
    <div className="max-w-lg w-full">
      <div className="bg-card rounded-2xl border border-border shadow-lg p-8 text-center">
        <img src={logo} alt="Jo's Coffee Shop" className="w-20 h-20 mx-auto object-contain mb-4" referrerPolicy="no-referrer" />
        <h1 className="font-display text-2xl font-bold text-foreground mb-1">Jo's Coffee Shop</h1>
        <p className="text-muted-foreground text-sm mb-6">Point of Sale System</p>
        <div className="border-t border-border pt-6 mb-6">
          <p className="text-sm text-muted-foreground mb-4">
            Created by the following <span className="font-semibold text-foreground">UB BSCS Students</span>:
          </p>
          <div className="space-y-1.5 mb-6">
            {developers.map(name => <p key={name} className="text-sm font-medium text-foreground">{name}</p>)}
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            As requirement for their course in <span className="font-semibold text-foreground">Software Engineering 2</span> with{' '}
            <span className="font-semibold text-foreground">Sir Julian Morales</span>, A.Y. 2025–2026
          </p>
        </div>
        <div className="border-t border-border pt-6 mb-6">
          <h3 className="font-display text-lg font-bold text-foreground mb-4">Languages & Technologies</h3>
          <div className="space-y-3">
            {techStack.map(group => (
              <div key={group.category}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{group.category}</p>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {group.items.map(item => (
                    <span key={item} className="px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-medium">{item}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <button onClick={onBack}
          className="flex items-center gap-2 mx-auto px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity">
          <ArrowLeft size={16} /> Back
        </button>
      </div>
    </div>
  </div>
);

export default Credits;
