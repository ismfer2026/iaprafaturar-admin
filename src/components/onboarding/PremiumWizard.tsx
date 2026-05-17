import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Check, ChevronUp, ChevronDown } from 'lucide-react';

// Tipos de perguntas suportadas
export type QuestionType = 'text' | 'email' | 'tel' | 'choice' | 'long_text';

export interface PremiumQuestion {
  id: string;
  title: string;
  subtitle?: string;
  type: QuestionType;
  options?: string[]; // Para perguntas de múltipla escolha
  placeholder?: string;
  required?: boolean;
}

interface PremiumWizardProps {
  questions: PremiumQuestion[];
  onComplete: (answers: Record<string, string>) => void;
}

export function PremiumWizard({ questions, onComplete }: PremiumWizardProps) {
  const [currentIdx, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const[error, setError] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const q = questions[currentIdx];
  const progress = ((currentIdx + 1) / questions.length) * 100;
  const isLast = currentIdx === questions.length - 1;

  // Auto-focus com pequeno delay para a animação terminar
  useEffect(() => {
    if (inputRef.current && q.type !== 'choice') {
      setTimeout(() => inputRef.current?.focus(), 400);
    }
  },[currentIdx, q.type]);

  const handleNext = () => {
    if (q.required && (!answers[q.id] || answers[q.id].trim() === '')) {
      setError('Por favor, preencha este campo antes de continuar.');
      return;
    }
    setError('');
    
    if (isLast) {
      onComplete(answers);
    } else {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
        setIsTransitioning(false);
      }, 300); // Tempo da animação de saída
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex(prev => prev - 1);
        setError('');
        setIsTransitioning(false);
      }, 300);
    }
  };

  // Captura o "Enter" do teclado
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && q.type !== 'long_text') {
      e.preventDefault();
      handleNext();
    }
  };

  // Seleção rápida para botões de múltipla escolha
  const handleChoiceSelect = (option: string) => {
    setAnswers({ ...answers,[q.id]: option });
    setError('');
    // Avança automaticamente após meio segundo para dar o feedback visual
    setTimeout(handleNext, 400);
  };

  // =========================================================================
  // RENDERIZAÇÃO DO INPUT COM DESIGN PREMIUM (Sem bordas feias)
  // =========================================================================
  const renderInput = () => {
    const value = answers[q.id] || '';
    const onChange = (val: string) => {
      setAnswers({ ...answers, [q.id]: val });
      if (error) setError('');
    };

    if (q.type === 'choice' && q.options) {
      return (
        <div className="flex flex-col gap-3 mt-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 fill-mode-both">
          {q.options.map((opt, i) => {
            const isSelected = value === opt;
            const letter = String.fromCharCode(65 + i); // A, B, C...
            return (
              <button
                key={opt}
                onClick={() => handleChoiceSelect(opt)}
                className={`group flex items-center w-full max-w-md p-3 sm:p-4 rounded-xl border-2 text-left transition-all duration-200 ease-out ${
                  isSelected 
                    ? 'border-[#0D6E6E] bg-[#0D6E6E]/10' 
                    : 'border-slate-200 bg-white/50 hover:border-[#0D6E6E]/50 hover:bg-[#0D6E6E]/5'
                }`}
              >
                <div className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-md mr-4 text-sm font-bold transition-colors ${
                  isSelected ? 'bg-[#0D6E6E] text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-[#0D6E6E]/20 group-hover:text-[#0D6E6E]'
                }`}>
                  {letter}
                </div>
                <span className={`text-lg sm:text-xl font-medium ${isSelected ? 'text-[#0D6E6E]' : 'text-slate-700'}`}>
                  {opt}
                </span>
              </button>
            );
          })}
        </div>
      );
    }

    if (q.type === 'long_text') {
      return (
        <textarea
          ref={inputRef as any}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={q.placeholder || "Digite sua resposta aqui..."}
          className="w-full max-w-2xl bg-transparent text-2xl sm:text-3xl text-slate-800 placeholder:text-slate-300 border-0 border-b-2 border-slate-200 focus:border-[#0D6E6E] focus:ring-0 outline-none resize-none py-4 mt-4 transition-colors min-h-[150px] animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 fill-mode-both"
        />
      );
    }

    return (
      <input
        ref={inputRef as any}
        type={q.type}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={q.placeholder || "Digite sua resposta..."}
        className="w-full max-w-2xl bg-transparent text-3xl sm:text-5xl font-light text-[#0D6E6E] placeholder:text-slate-200 border-0 border-b-2 border-slate-200 focus:border-[#0D6E6E] focus:ring-0 outline-none py-4 mt-4 transition-colors animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 fill-mode-both"
      />
    );
  };

  return (
    <div className="fixed inset-0 bg-[#Fdfdfd] flex flex-col font-sans overflow-hidden">
      
      {/* BARRA DE PROGRESSO NO TOPO */}
      <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-100">
        <div 
          className="h-full bg-[#0D6E6E] transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* ÁREA CENTRAL */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-16 md:px-32 max-w-5xl w-full mx-auto relative">
        
        {/* Container da Pergunta com Animação de Troca */}
        <div className={`transition-all duration-300 ease-in-out ${isTransitioning ? 'opacity-0 -translate-y-8' : 'opacity-100 translate-y-0'}`}>
          
          <div className="flex items-start gap-4 sm:gap-6">
            {/* Número da Pergunta */}
            <div className="flex items-center text-xl sm:text-2xl font-bold text-[#0D6E6E] mt-1 sm:mt-2">
              {currentIdx + 1}
              <ArrowRight className="w-5 h-5 ml-2 opacity-50" />
            </div>

            {/* Texto da Pergunta */}
            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-medium text-slate-800 leading-tight tracking-tight">
                {q.title}
              </h1>
              {q.subtitle && (
                <p className="text-lg sm:text-xl text-slate-500 mt-3 font-light">
                  {q.subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="ml-0 sm:ml-[4.5rem]">
            {renderInput()}
            
            {/* Mensagem de Erro */}
            {error && (
              <div className="mt-4 inline-flex items-center px-3 py-1 rounded-md bg-red-50 text-red-600 text-sm font-medium animate-in fade-in zoom-in duration-300">
                {error}
              </div>
            )}

            {/* BOTÃO OK / ENTER */}
            {q.type !== 'choice' && (
              <div className="mt-10 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 fill-mode-both">
                <button
                  onClick={handleNext}
                  className="group flex items-center gap-2 bg-[#0D6E6E] hover:bg-[#0a5858] text-white px-8 py-3 sm:py-4 rounded-xl text-lg sm:text-xl font-bold transition-all active:scale-95 shadow-lg shadow-[#0D6E6E]/20"
                >
                  {isLast ? 'Finalizar' : 'OK'}
                  {isLast ? <Check className="w-6 h-6" /> : <Check className="w-6 h-6 group-hover:translate-x-1 transition-transform" />}
                </button>
                <span className="text-sm font-medium text-slate-400 hidden sm:flex items-center gap-1">
                  pressione <kbd className="font-sans px-2 py-1 bg-slate-100 rounded-md text-slate-600 font-bold border border-slate-200">Enter ↵</kbd>
                </span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* NAVEGAÇÃO INFERIOR E MARCA D'ÁGUA */}
      <div className="absolute bottom-0 right-0 w-full p-6 flex justify-between items-center bg-gradient-to-t from-white via-white to-transparent">
        <a href="https://iaprafaturar.com.br" target="_blank" className="text-xs font-bold text-slate-300 hover:text-slate-400 transition-colors uppercase tracking-widest">
          Powered by iaprafaturar
        </a>
        
        <div className="flex gap-2">
          <button 
            onClick={handlePrev}
            disabled={currentIdx === 0}
            className="w-10 h-10 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 flex items-center justify-center text-slate-600 transition-colors"
          >
            <ChevronUp className="w-6 h-6" />
          </button>
          <button 
            onClick={handleNext}
            className="w-10 h-10 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
          >
            <ChevronDown className="w-6 h-6" />
          </button>
        </div>
      </div>

    </div>
  );
}