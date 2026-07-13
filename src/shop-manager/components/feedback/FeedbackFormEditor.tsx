
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { FeedbackForm, FeedbackQuestion, QuestionType } from '@/types/feedback';
import { 
  createFeedbackForm, 
  getFeedbackFormWithQuestions, 
  updateFeedbackForm,
  createFeedbackQuestions,
  updateFeedbackQuestion,
  deleteFeedbackQuestion
} from '@/services/feedbackService';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Trash, MoveUp, MoveDown, Save } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

// Form validation schema
const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

// Initial question template
const newQuestionTemplate: Omit<FeedbackQuestion, 'id' | 'form_id' | 'created_at' | 'updated_at'> = {
  question: '',
  question_type: 'text',
  options: [],
  is_required: true,
  display_order: 0,
};

export const FeedbackFormEditor: React.FC = () => {
  const { formId } = useParams<{ formId: string }>();
  const isEditing = !!formId && formId !== 'new';
  const navigate = useNavigate();
  
  const [form, setForm] = useState<FeedbackForm | null>(null);
  const [questions, setQuestions] = useState<Array<Partial<FeedbackQuestion> & { localId?: string }>>([]);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  
  const [shopId, setShopId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>('');

  // Fetch shop ID and user name from auth
  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Get profile with shop_id
        const { data: profile } = await supabase
          .from('profiles')
          .select('shop_id, first_name, last_name')
          .or(`id.eq.${user.id},user_id.eq.${user.id}`)
          .maybeSingle();
        
        if (profile) {
          setShopId(profile.shop_id);
          setCurrentUserName(`${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Admin User');
        }
      }
    };
    fetchUserData();
  }, []);

  const formMethods = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      is_active: true,
    },
  });

  useEffect(() => {
    if (isEditing) {
      const loadForm = async () => {
        const formData = await getFeedbackFormWithQuestions(formId);
        if (formData) {
          setForm(formData);
          formMethods.reset({
            title: formData.title,
            description: formData.description || '',
            is_active: formData.is_active,
          });
          
          if (formData.questions && formData.questions.length > 0) {
            setQuestions(formData.questions.map(q => ({ ...q, localId: `existing-${q.id}` })));
          }
        } else {
          toast({
            title: 'Error',
            description: 'Failed to load feedback form. Please try again.',
            variant: 'destructive',
          });
          navigate('/feedback/forms');
        }
        setLoading(false);
      };
      
      loadForm();
    } else {
      // Add one empty question when creating a new form
      addQuestion();
    }
  }, [formId, isEditing, navigate]);

  const addQuestion = () => {
    const newQuestion = {
      ...newQuestionTemplate,
      localId: `new-${Date.now()}`,
      display_order: questions.length,
    };
    setQuestions([...questions, newQuestion]);
  };

  const removeQuestion = (index: number) => {
    const newQuestions = [...questions];
    newQuestions.splice(index, 1);
    // Update display_order for remaining questions
    newQuestions.forEach((q, i) => {
      q.display_order = i;
    });
    setQuestions(newQuestions);
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    const newQuestions = [...questions];
    
    // Handle special case for question_type
    if (field === 'question_type') {
      // Reset options when changing question type
      if (value === 'multiple_choice' && (!newQuestions[index].options || newQuestions[index].options?.length === 0)) {
        newQuestions[index].options = ['Option 1'];
      } else if (value !== 'multiple_choice') {
        newQuestions[index].options = [];
      }
    }
    
    // Update the field
    (newQuestions[index] as any)[field] = value;
    setQuestions(newQuestions);
  };

  const addOption = (questionIndex: number) => {
    const newQuestions = [...questions];
    const currentOptions = newQuestions[questionIndex].options || [];
    newQuestions[questionIndex].options = [...currentOptions, `Option ${currentOptions.length + 1}`];
    setQuestions(newQuestions);
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const newQuestions = [...questions];
    if (newQuestions[questionIndex].options) {
      newQuestions[questionIndex].options![optionIndex] = value;
      setQuestions(newQuestions);
    }
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const newQuestions = [...questions];
    if (newQuestions[questionIndex].options) {
      newQuestions[questionIndex].options = newQuestions[questionIndex].options!.filter((_, i) => i !== optionIndex);
      setQuestions(newQuestions);
    }
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || 
        (direction === 'down' && index === questions.length - 1)) {
      return;
    }
    
    const newQuestions = [...questions];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap display_order values
    const tempOrder = newQuestions[index].display_order;
    newQuestions[index].display_order = newQuestions[swapIndex].display_order;
    newQuestions[swapIndex].display_order = tempOrder;
    
    // Swap positions in the array
    [newQuestions[index], newQuestions[swapIndex]] = [newQuestions[swapIndex], newQuestions[index]];
    
    setQuestions(newQuestions);
  };

  const onDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const items = Array.from(questions);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    // Update display_order values
    items.forEach((item, index) => {
      item.display_order = index;
    });
    
    setQuestions(items);
  };

  const onSubmit = async (values: FormValues) => {
    if (questions.length === 0) {
      toast({
        title: 'Error',
        description: 'At least one question is required',
        variant: 'destructive',
      });
      return;
    }
    
    // Validate all questions have content
    const invalidQuestions = questions.filter(q => !q.question);
    if (invalidQuestions.length > 0) {
      toast({
        title: 'Error',
        description: 'All questions must have content',
        variant: 'destructive',
      });
      return;
    }
    
    setSaving(true);
    
    try {
      let formData: FeedbackForm;
      
      // Handle form creation/update
      if (isEditing && form) {
        // Update existing form
        const success = await updateFeedbackForm(form.id, {
          title: values.title,
          description: values.description,
          is_active: values.is_active,
        });
        
        if (!success) throw new Error('Failed to update form');
        formData = { ...form, ...values };
      } else {
        // Create new form
        if (!shopId) {
          toast({
            title: 'Error',
            description: 'Unable to create form. Please try again.',
            variant: 'destructive',
          });
          setSaving(false);
          return;
        }
        const newForm = await createFeedbackForm({
          shop_id: shopId,
          title: values.title,
          description: values.description,
          is_active: values.is_active,
          created_by: currentUserName,
        });
        
        if (!newForm) throw new Error('Failed to create form');
        formData = newForm;
      }
      
      // Handle questions
      if (isEditing) {
        // Process updates, deletions, and additions separately
        const existingQuestions = questions.filter(q => q.id);
        const newQuestionsToAdd = questions.filter(q => !q.id);
        
        // Update existing questions
        for (const question of existingQuestions) {
          if (question.id) {
            await updateFeedbackQuestion(question.id, {
              question: question.question!,
              question_type: question.question_type as QuestionType,
              options: question.options || null,
              is_required: question.is_required!,
              display_order: question.display_order!,
            });
          }
        }
        
        // Add new questions
        if (newQuestionsToAdd.length > 0) {
          await createFeedbackQuestions(newQuestionsToAdd.map(q => ({
            form_id: formData.id,
            question: q.question!,
            question_type: q.question_type as QuestionType,
            options: q.options || null,
            is_required: q.is_required!,
            display_order: q.display_order!,
          })));
        }
        
        // Note: Deletions are handled implicitly by the absence of a question in the updated list
        // Deleting all questions first and then re-adding them would be another approach
      } else {
        // Add all questions for a new form
        await createFeedbackQuestions(questions.map(q => ({
          form_id: formData.id,
          question: q.question!,
          question_type: q.question_type as QuestionType,
          options: q.options || null,
          is_required: q.is_required!,
          display_order: q.display_order!,
        })));
      }
      
      toast({
        title: 'Success',
        description: isEditing ? 'Form updated successfully' : 'Form created successfully',
        variant: 'success',
      });
      
      navigate('/feedback/forms');
    } catch (error) {
      console.error('Error saving form:', error);
      toast({
        title: 'Error',
        description: `Failed to ${isEditing ? 'update' : 'create'} form. Please try again.`,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-gray-500">Loading form editor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/feedback/forms')}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Forms
        </Button>
        <h1 className="text-2xl font-bold">
          {isEditing ? 'Edit Feedback Form' : 'Create Feedback Form'}
        </h1>
      </div>
      
      <Form {...formMethods}>
        <form onSubmit={formMethods.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Form Details</CardTitle>
              <CardDescription>
                Basic information about your feedback form
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={formMethods.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Form Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Customer Satisfaction Survey" {...field} />
                    </FormControl>
                    <FormDescription>
                      A clear and concise title for your feedback form
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={formMethods.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Help us improve by sharing your experience with our service" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      A brief explanation of the purpose of this feedback form
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={formMethods.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active Status</FormLabel>
                      <FormDescription>
                        Whether this form is active and can receive submissions
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Questions</CardTitle>
                <CardDescription>
                  Define the questions for your feedback form
                </CardDescription>
              </div>
              <Button type="button" onClick={addQuestion} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </Button>
            </CardHeader>
            <CardContent>
              {questions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No questions added yet</p>
                  <Button onClick={addQuestion} className="mt-2" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Question
                  </Button>
                </div>
              ) : (
                <DragDropContext onDragEnd={onDragEnd}>
                  <Droppable droppableId="questions">
                    {(provided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="space-y-4"
                      >
                        {questions.map((question, index) => (
                          <Draggable 
                            key={question.localId || `question-${index}`} 
                            draggableId={question.localId || `question-${index}`} 
                            index={index}
                          >
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className="border rounded-md p-4 bg-white"
                              >
                                <div className="space-y-4">
                                  <div className="flex justify-between items-center">
                                    <h3 className="font-medium">Question {index + 1}</h3>
                                    <div className="flex items-center space-x-2">
                                      <Button 
                                        type="button" 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={() => moveQuestion(index, 'up')}
                                        disabled={index === 0}
                                      >
                                        <MoveUp className="h-4 w-4" />
                                      </Button>
                                      <Button 
                                        type="button" 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={() => moveQuestion(index, 'down')}
                                        disabled={index === questions.length - 1}
                                      >
                                        <MoveDown className="h-4 w-4" />
                                      </Button>
                                      <Button 
                                        type="button" 
                                        variant="ghost" 
                                        size="sm" 
                                        className="text-red-500 hover:text-red-700"
                                        onClick={() => removeQuestion(index)}
                                        disabled={questions.length === 1}
                                      >
                                        <Trash className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <Label htmlFor={`question-${index}`}>Question</Label>
                                      <Input
                                        id={`question-${index}`}
                                        value={question.question || ''}
                                        onChange={(e) => updateQuestion(index, 'question', e.target.value)}
                                        placeholder="How would you rate our service?"
                                        className="mt-1"
                                      />
                                    </div>
                                    
                                    <div>
                                      <Label htmlFor={`question-type-${index}`}>Question Type</Label>
                                      <Select
                                        value={question.question_type}
                                        onValueChange={(value) => updateQuestion(index, 'question_type', value)}
                                      >
                                        <SelectTrigger className="mt-1">
                                          <SelectValue placeholder="Select question type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="text">Text Response</SelectItem>
                                          <SelectItem value="rating">Rating Scale</SelectItem>
                                          <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                                          <SelectItem value="yes_no">Yes/No</SelectItem>
                                          <SelectItem value="nps">NPS (0-10)</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center space-x-2">
                                    <Switch
                                      id={`required-${index}`}
                                      checked={question.is_required}
                                      onCheckedChange={(checked) => updateQuestion(index, 'is_required', checked)}
                                    />
                                    <Label htmlFor={`required-${index}`}>Required</Label>
                                  </div>
                                  
                                  {question.question_type === 'multiple_choice' && (
                                    <div className="space-y-2">
                                      <Label>Options</Label>
                                      {question.options?.map((option, optionIndex) => (
                                        <div key={`option-${index}-${optionIndex}`} className="flex items-center space-x-2">
                                          <Input
                                            value={option}
                                            onChange={(e) => updateOption(index, optionIndex, e.target.value)}
                                            placeholder={`Option ${optionIndex + 1}`}
                                          />
                                          <Button 
                                            type="button" 
                                            variant="ghost" 
                                            size="sm"
                                            onClick={() => removeOption(index, optionIndex)}
                                            disabled={question.options?.length === 1}
                                            className="text-red-500 hover:text-red-700"
                                          >
                                            <Trash className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      ))}
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => addOption(index)}
                                        className="mt-2"
                                      >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Option
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/feedback/forms')}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
              >
                {saving && <div className="spinner mr-2" />}
                <Save className="h-4 w-4 mr-2" />
                {isEditing ? 'Update Form' : 'Create Form'}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
};
