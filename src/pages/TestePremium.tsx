import { PremiumWizard, PremiumQuestion } from '../components/onboarding/PremiumWizard';

const perguntasTeste: PremiumQuestion[] =[
  {
    id: 'nome',
    title: 'Qual é o seu nome completo?',
    subtitle: 'Prometemos não mandar spam.',
    type: 'text',
    placeholder: 'Ex: João da Silva',
    required: true
  },
  {
    id: 'objetivo',
    title: 'O que você busca na clínica hoje?',
    type: 'choice',
    options:['Limpeza de Pele', 'Botox / Preenchimento', 'Apenas Avaliação', 'Outro procedimento'],
  },
  {
    id: 'obs',
    title: 'Algo mais que precisamos saber?',
    subtitle: 'Alergias, medicações de uso contínuo, etc.',
    type: 'long_text',
    placeholder: 'Digite aqui...'
  }
];

export default function TestePremium() {
  return (
    <PremiumWizard 
      questions={perguntasTeste} 
      onComplete={(respostas) => {
        console.log("Finalizou!", respostas);
        alert("Respostas coletadas: " + JSON.stringify(respostas));
      }} 
    />
  );
}