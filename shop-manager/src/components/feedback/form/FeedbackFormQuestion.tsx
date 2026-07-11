
import React from 'react';
import { FeedbackQuestion, QuestionType } from '@/types/feedback';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { Star, ThumbsUp, ThumbsDown } from 'lucide-react';
import { RequiredIndicator } from '@/components/ui/required-indicator';

interface FeedbackFormQuestionProps {
  question: FeedbackQuestion;
  value: any;
  onChange: (questionId: string, value: any) => void;
}

export const FeedbackFormQuestion: React.FC<FeedbackFormQuestionProps> = ({
  question,
  value,
  onChange,
}) => {
  switch (question.question_type) {
    case 'text':
      return (
        <div className="space-y-2">
          <Label htmlFor={question.id}>
            {question.question} {question.is_required && <RequiredIndicator />}
          </Label>
          <Textarea
            id={question.id}
            value={value || ''}
            onChange={(e) => onChange(question.id, e.target.value)}
            placeholder="Your answer"
            rows={3}
          />
        </div>
      );
        
    case 'rating':
      return <RatingQuestion question={question} value={value} onChange={onChange} />;
      
    case 'multiple_choice':
      return <MultipleChoiceQuestion question={question} value={value} onChange={onChange} />;
      
    case 'yes_no':
      return <YesNoQuestion question={question} value={value} onChange={onChange} />;
      
    case 'nps':
      return <NPSQuestion question={question} value={value} onChange={onChange} />;
      
    default:
      return null;
  }
};

const RatingQuestion: React.FC<FeedbackFormQuestionProps> = ({ question, value, onChange }) => {
  return (
    <div className="space-y-4">
      <Label>
        {question.question} {question.is_required && <RequiredIndicator />}
      </Label>
      <div className="flex flex-col items-center">
        <div className="flex items-center justify-between w-full max-w-xs">
          <span className="text-sm text-gray-500">Poor</span>
          <span className="text-sm text-gray-500">Excellent</span>
        </div>
        <div className="flex items-center justify-between w-full max-w-xs mb-2">
          {[1, 2, 3, 4, 5].map((ratingValue) => (
            <Button
              key={ratingValue}
              type="button"
              variant={value === ratingValue ? "default" : "outline"}
              size="sm"
              className="w-10 h-10 rounded-full flex items-center justify-center"
              onClick={() => onChange(question.id, ratingValue)}
            >
              {ratingValue}
            </Button>
          ))}
        </div>
        <div className="flex items-center space-x-1 text-yellow-400">
          {[1, 2, 3, 4, 5].map((ratingValue) => (
            <Star
              key={ratingValue}
              className={`h-5 w-5 ${value >= ratingValue ? 'fill-current' : 'stroke-current fill-none'}`}
              onClick={() => onChange(question.id, ratingValue)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const MultipleChoiceQuestion: React.FC<FeedbackFormQuestionProps> = ({ question, value, onChange }) => {
  return (
    <div className="space-y-2">
      <Label>
        {question.question} {question.is_required && <RequiredIndicator />}
      </Label>
      <RadioGroup
        value={value || ''}
        onValueChange={(val) => onChange(question.id, val)}
        className="space-y-1"
      >
        {question.options?.map((option, i) => (
          <div key={i} className="flex items-center space-x-2">
            <RadioGroupItem value={option} id={`${question.id}-option-${i}`} />
            <Label htmlFor={`${question.id}-option-${i}`}>{option}</Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
};

const YesNoQuestion: React.FC<FeedbackFormQuestionProps> = ({ question, value, onChange }) => {
  return (
    <div className="space-y-2">
      <Label>
        {question.question} {question.is_required && <RequiredIndicator />}
      </Label>
      <div className="flex items-center space-x-4">
        <Button
          type="button"
          variant={value === true ? "default" : "outline"}
          size="sm"
          className={value === true ? "bg-green-500 hover:bg-green-600" : ""}
          onClick={() => onChange(question.id, true)}
        >
          <ThumbsUp className="h-4 w-4 mr-2" />
          Yes
        </Button>
        <Button
          type="button"
          variant={value === false ? "default" : "outline"}
          size="sm"
          className={value === false ? "bg-red-500 hover:bg-red-600" : ""}
          onClick={() => onChange(question.id, false)}
        >
          <ThumbsDown className="h-4 w-4 mr-2" />
          No
        </Button>
      </div>
    </div>
  );
};

const NPSQuestion: React.FC<FeedbackFormQuestionProps> = ({ question, value, onChange }) => {
  return (
    <div className="space-y-4">
      <Label>
        {question.question} {question.is_required && <RequiredIndicator />}
      </Label>
      <div className="w-full px-2">
        <div className="flex justify-between mb-2">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((npsValue) => (
            <Button
              key={npsValue}
              type="button"
              variant={value === npsValue ? "default" : "outline"}
              size="sm"
              className={`w-8 h-8 p-0 ${
                value === npsValue
                  ? npsValue >= 9
                    ? "bg-green-500 hover:bg-green-600"
                    : npsValue >= 7
                    ? "bg-yellow-500 hover:bg-yellow-600"
                    : "bg-red-500 hover:bg-red-600"
                  : ""
              }`}
              onClick={() => onChange(question.id, npsValue)}
            >
              {npsValue}
            </Button>
          ))}
        </div>
        <div className="flex justify-between text-xs text-gray-500 px-1">
          <span>Not at all likely</span>
          <span>Extremely likely</span>
        </div>
      </div>
    </div>
  );
};
