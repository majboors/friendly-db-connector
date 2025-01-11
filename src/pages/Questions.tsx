import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { Database } from "@/integrations/supabase/types"

type PromptType = Database["public"]["Enums"]["prompt_type"]

type Question = {
  content: string;
  choices?: string[];
  correctAnswer?: string;
  passage?: string;
  questions?: Array<{
    question: string;
    choices: string[];
    correctAnswer: string;
    sentence?: string;
    underlined?: string;
  }>;
}

export default function Questions() {
  const [isLoading, setIsLoading] = useState(false)
  const [question, setQuestion] = useState<Question | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const { toast } = useToast()

  const generateQuestion = async (type: PromptType) => {
    console.log("Generating question of type:", type)
    setIsLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      console.log("Session:", session)
      
      if (!session) {
        throw new Error('No session found. Please log in.')
      }

      console.log("Making request to generate-question function")
      const response = await supabase.functions.invoke('generate-question', {
        body: { prompt_type: type }
      })

      console.log("Response from function:", response)

      if (response.error) {
        throw new Error(response.error.message || 'Failed to generate question')
      }

      if (!response.data) {
        throw new Error('No data received from the function')
      }

      console.log("Parsing response data:", response.data)
      const parsedContent = JSON.parse(response.data.content)
      console.log("Parsed content:", parsedContent)
      
      setQuestion(parsedContent)
      setSelectedAnswer(null)
      setCurrentQuestionIndex(0)

    } catch (error) {
      console.error('Error generating question:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate question. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getCurrentQuestion = () => {
    if (!question) return null
    if (question.questions && question.questions[currentQuestionIndex]) {
      return question.questions[currentQuestionIndex]
    }
    // For single questions, create a consistent format
    return {
      question: question.content,
      choices: question.choices || [],
      correctAnswer: question.correctAnswer || "",
      sentence: undefined,
      underlined: undefined
    }
  }

  const checkAnswer = () => {
    if (!selectedAnswer || !question) return

    const currentQuestion = getCurrentQuestion()
    if (!currentQuestion) return

    const correctAnswer = currentQuestion.correctAnswer
    if (!correctAnswer) return

    const isCorrect = selectedAnswer === correctAnswer
    toast({
      title: isCorrect ? "Correct!" : "Incorrect",
      description: isCorrect 
        ? "Great job! Try another question." 
        : `The correct answer was ${correctAnswer}`,
      variant: isCorrect ? "default" : "destructive",
    })

    if (question.questions && currentQuestionIndex < question.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
      setSelectedAnswer(null)
    }
  }

  const currentQuestionData = getCurrentQuestion()

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-8">SAT Practice Questions</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <Button
          onClick={() => generateQuestion("math_with_calculator")}
          disabled={isLoading}
        >
          Math (Calculator)
        </Button>
        <Button
          onClick={() => generateQuestion("math_no_calculator")}
          disabled={isLoading}
        >
          Math (No Calculator)
        </Button>
        <Button
          onClick={() => generateQuestion("reading_passage")}
          disabled={isLoading}
        >
          Reading
        </Button>
        <Button
          onClick={() => generateQuestion("writing_passage")}
          disabled={isLoading}
        >
          Writing
        </Button>
      </div>

      {isLoading && (
        <div className="text-center">
          <p>Generating question...</p>
        </div>
      )}

      {question && !isLoading && getCurrentQuestion() && (
        <Card className="p-6">
          <div className="prose max-w-none">
            {question.passage && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4">Passage</h2>
                <p className="mb-6">{question.passage}</p>
              </div>
            )}

            <h2 className="text-xl font-semibold mb-4">
              Question {question.questions ? `${currentQuestionIndex + 1}/${question.questions.length}` : ''}
            </h2>
            
            {getCurrentQuestion()?.sentence && (
              <div className="mb-4">
                <p className="font-medium">Sentence:</p>
                <p>{getCurrentQuestion()?.sentence}</p>
              </div>
            )}
            
            {getCurrentQuestion()?.underlined && (
              <div className="mb-4">
                <p className="font-medium">Underlined portion:</p>
                <p className="underline">{getCurrentQuestion()?.underlined}</p>
              </div>
            )}
            
            <p className="mb-6">{getCurrentQuestion()?.question}</p>

            <div className="space-y-4">
              {getCurrentQuestion()?.choices?.map((choice, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id={`choice-${index}`}
                    name="answer"
                    value={choice}
                    checked={selectedAnswer === choice}
                    onChange={(e) => setSelectedAnswer(e.target.value)}
                    className="w-4 h-4"
                  />
                  <label htmlFor={`choice-${index}`}>{choice}</label>
                </div>
              ))}
            </div>

            <Button
              onClick={checkAnswer}
              disabled={!selectedAnswer}
              className="mt-6"
            >
              Check Answer
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}