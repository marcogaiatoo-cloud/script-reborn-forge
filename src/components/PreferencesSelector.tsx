import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

export type MySQLType = 'mysql-async' | 'oxmysql';
export type LibType = 'default' | 'ox_lib';

interface PreferencesSelectorProps {
  mysqlType: MySQLType;
  libType: LibType;
  onMySQLChange: (value: MySQLType) => void;
  onLibChange: (value: LibType) => void;
}

const PreferencesSelector = ({ mysqlType, libType, onMySQLChange, onLibChange }: PreferencesSelectorProps) => {
  return (
    <div className="space-y-4">
      {/* MySQL Selection */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">
          MySQL Library
        </label>
        <RadioGroup
          value={mysqlType}
          onValueChange={(v) => onMySQLChange(v as MySQLType)}
          className="grid grid-cols-2 gap-3"
        >
          <div>
            <RadioGroupItem
              value="mysql-async"
              id="mysql-async"
              className="peer sr-only"
            />
            <Label
              htmlFor="mysql-async"
              className="flex flex-col items-center justify-center rounded-lg border-2 border-border bg-card p-3 hover:bg-secondary/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 cursor-pointer transition-all duration-200"
            >
              <span className="font-mono font-semibold text-sm text-foreground">
                mysql-async
              </span>
              <span className="text-xs text-muted-foreground mt-0.5 text-center">
                Default MySQL
              </span>
            </Label>
          </div>
          <div>
            <RadioGroupItem
              value="oxmysql"
              id="oxmysql"
              className="peer sr-only"
            />
            <Label
              htmlFor="oxmysql"
              className="flex flex-col items-center justify-center rounded-lg border-2 border-border bg-card p-3 hover:bg-secondary/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 cursor-pointer transition-all duration-200"
            >
              <span className="font-mono font-semibold text-sm text-foreground">
                oxmysql
              </span>
              <span className="text-xs text-muted-foreground mt-0.5 text-center">
                Overextended MySQL
              </span>
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Lib Selection */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">
          Libs & Utilities
        </label>
        <RadioGroup
          value={libType}
          onValueChange={(v) => onLibChange(v as LibType)}
          className="grid grid-cols-2 gap-3"
        >
          <div>
            <RadioGroupItem
              value="default"
              id="lib-default"
              className="peer sr-only"
            />
            <Label
              htmlFor="lib-default"
              className="flex flex-col items-center justify-center rounded-lg border-2 border-border bg-card p-3 hover:bg-secondary/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 cursor-pointer transition-all duration-200"
            >
              <span className="font-mono font-semibold text-sm text-foreground">
                Default
              </span>
              <span className="text-xs text-muted-foreground mt-0.5 text-center">
                Natives e código vanilla
              </span>
            </Label>
          </div>
          <div>
            <RadioGroupItem
              value="ox_lib"
              id="lib-ox"
              className="peer sr-only"
            />
            <Label
              htmlFor="lib-ox"
              className="flex flex-col items-center justify-center rounded-lg border-2 border-border bg-card p-3 hover:bg-secondary/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 cursor-pointer transition-all duration-200"
            >
              <span className="font-mono font-semibold text-sm text-foreground">
                ox_lib
              </span>
              <span className="text-xs text-muted-foreground mt-0.5 text-center">
                Overextended Library
              </span>
            </Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  );
};

export default PreferencesSelector;
