import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Check, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/i18n';

export type QuestionType = 'text' | 'tel' | 'date' | 'select' | 'textarea' | 'multiselect';

export interface Question {
  id: string;
  text: string;
  description?: string;
  type: QuestionType;
  options?: { value: string; label: string }[];
  required?: boolean;
}

interface TypeformWizardProps {
  title?: string;
  questions: Question[];
  onComplete: (answers: Record<string, any>) => void;
  isSubmitting?: boolean;
}

export function TypeformWizard({ title, questions, onComplete, isSubmitting }: TypeformWizardProps) {
  const { t } = useI18n()
  const[currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const question = questions[currentStep];
  const progress = ((currentStep + 1) / questions.length) * 100;
  const isLast = currentStep === questions.length - 1;

  useEffect(() => {
    if (inputRef.current && question.type !== 'select') {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  },[currentStep, question.type]);

  const handleNext = () => {
    if (question.required && !answers[question.id]) {
      setError('Por favor, preencha este campo para continuar.');
      return;
    }
    setError('');

    if (isLast) {
      onComplete(answers);
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      setError('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && question.type !== 'textarea') {
      e.preventDefault();
      handleNext();
    }
  };

  const renderInput = () => {
    const value = answers[question.id] || '';
    const onChangeText = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setAnswers({ ...answers, [question.id]: e.target.value });
    const onChangeSelect = (val: string) => setAnswers({ ...answers, [question.id]: val });

    switch (question.type) {
      case 'select':
        return (
          <Select value={value} onValueChange={onChangeSelect}>
            <SelectTrigger className="w-full text-xl sm:text-2xl h-14 bg-transparent border-b-2 border-t-0 border-l-0 border-r-0 border-slate-300 rounded-none focus:ring-0 focus:border-primary px-0">
              <SelectValue placeholder={t('onboarding.select_placeholder')} />
            </SelectTrigger>
            <SelectContent>
              {question.options?.map(opt => (
                <SelectItem key={opt.value} value={opt.value} className="text-lg py-3">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'textarea':
        return (
          <Textarea 
            ref={inputRef as any}
            value={value} 
            onChange={onChangeText}
            placeholder={t('onboarding.response_placeholder')}
            className="w-full text-xl sm:text-2xl min-h-[150px] bg-transparent border-2 border-slate-200 rounded-xl focus:ring-0 focus:border-primary p-4 resize-none"
          />
        );
      default:
        return (
          <Input 
            ref={inputRef}
            type={question.type} 
            value={value} 
            onChange={onChangeText}
            onKeyDown={handleKeyDown}
            placeholder={t('onboarding.response_placeholder_short')}
            className="w-full text-2xl sm:text-4xl h-16 bg-transparent border-b-2 border-t-0 border-l-0 border-r-0 border-slate-300 rounded-none focus:ring-0 focus:border-primary px-0 placeholder:text-slate-300"
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans selection:bg-primary/20">
      <div className="h-1.5 w-full bg-slate-200 fixed top-0 left-0 z-50">
        <div className="h-full bg-[#0D6E6E] transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
      </div>

      <div className="p-6 flex justify-between items-center">
        <div className="flex items-center gap-4">
          {currentStep > 0 && (
            <Button variant="ghost" size="sm" onClick={handlePrev} className="text-slate-500 hover:text-slate-900">
              <ChevronLeft className="w-5 h-5 mr-1" /> Voltar
            </Button>
          )}
          {title && <span className="font-bold text-slate-800">{title}</span>}
        </div>
        <span className="text-sm font-medium text-slate-400">
          {currentStep + 1} de {questions.length}
        </span>
      </div>

      <div className="flex-1 flex flex-col justify-center max-w-3xl mx-auto w-full px-6 sm:px-12 pb-20">
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out">
          
          <div className="mb-8 flex items-start gap-4">
            <span className="text-xl sm:text-2xl font-bold text-[#0D6E6E] pt-1">
              {currentStep + 1}.
            </span>
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 leading-tight">
                {question.text}
              </h2>
              {question.description && (
                <p className="text-lg text-slate-500 mt-2">{question.description}</p>
              )}
            </div>
          </div>

          <div className="ml-0 sm:ml-10">
            {renderInput()}
            {error && <p className="text-red-500 text-sm mt-3 animate-in fade-in">{error}</p>}

            <div className="mt-8 flex items-center gap-4">
              <Button 
                size="lg" onClick={handleNext} disabled={isSubmitting}
                className="bg-[#0D6E6E] hover:bg-[#0a5858] text-white text-lg px-8 h-14 rounded-xl shadow-lg transition-transform active:scale-95"
              >
                {isSubmitting ? 'Processando...' : isLast ? <><Check className="w-5 h-5 mr-2" /> Finalizar</> : <>OK <ArrowRight className="w-5 h-5 ml-2" /></>}
              </Button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}