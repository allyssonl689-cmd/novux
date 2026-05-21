import { useCallback, useRef } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { parseCSV } from '@/lib/csv-parser';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';

export function CSVUpload() {
  const { addTransactions } = useFinance();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length === 0) {
        toast.error('Não foi possível ler o arquivo. Verifique o formato CSV.');
        return;
      }
      addTransactions(parsed as any);
      toast.success(`${parsed.length} transações importadas com sucesso.`);
    };
    reader.readAsText(file);
  }, [addTransactions]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) handleFile(file);
    else toast.error('Envie um arquivo .csv');
  }, [handleFile]);

  return (
    <div
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className="border-2 border-dashed border-border rounded-2xl p-8 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors"
    >
      <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
      <p className="text-sm font-medium text-foreground">Importar extrato CSV</p>
      <p className="text-xs text-muted-foreground mt-1">Arraste o arquivo ou clique para selecionar</p>
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}
