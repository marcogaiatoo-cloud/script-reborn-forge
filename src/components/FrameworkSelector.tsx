import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

export type Framework = 'esx' | 'qbcore' | 'standalone';

interface FrameworkSelectorProps {
  value: Framework;
  onChange: (value: Framework) => void;
}

const frameworks: { value: Framework; label: string; description: string }[] = [
  { value: 'esx', label: 'ESX', description: 'Extended Shared Extended Framework' },
  { value: 'qbcore', label: 'QBCore', description: 'QBCore Framework' },
  { value: 'standalone', label: 'Standalone', description: 'Sem dependências de framework' },
];

const FrameworkSelector = ({ value, onChange }: FrameworkSelectorProps) => {
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-foreground">
        Selecione o Framework
      </label>
      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as Framework)}
        className="grid grid-cols-1 sm:grid-cols-3 gap-3"
      >
        {frameworks.map((fw) => (
          <div key={fw.value}>
            <RadioGroupItem
              value={fw.value}
              id={fw.value}
              className="peer sr-only"
            />
            <Label
              htmlFor={fw.value}
              className="flex flex-col items-center justify-center rounded-lg border-2 border-border bg-card p-4 hover:bg-secondary/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 cursor-pointer transition-all duration-200"
            >
              <span className="font-mono font-semibold text-lg text-foreground">
                {fw.label}
              </span>
              <span className="text-xs text-muted-foreground mt-1 text-center">
                {fw.description}
              </span>
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
};

export default FrameworkSelector;
