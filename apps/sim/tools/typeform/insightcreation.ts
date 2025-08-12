
export const createInsights = (responses: any) => {
  if (!responses?.items) {
    return {
      total_responses: 0,
      average_time: 0,
      question_stats: [],
      drop_off_points: [],
    }
  }

  // Completion metrics
  const total_responses = responses.items.length
 
  // Time calculations
  const validTimes = responses.items
    .map((r: any) => (new Date(r.submitted_at).getTime() - new Date(r.landed_at).getTime()) / 1000)
  
  const average_time = validTimes.length > 0
    ? (validTimes.reduce((a: number, b: number) => a + b, 0) / validTimes.length)
    : 0

  // Question analysis
   const question_statsMap: Record<string, any> = {}; // Temp mapping
  const question_stats: Array<{
    question_id: string;
    answer_count: number;
    answer_types: Record<string, number>;
  }> = []; // Final array output

  responses.items.forEach((response: any) => {
    response.answers?.forEach((answer: any) => {
      const question_id = answer.field.id;
      
      // Initialize if new question
      if (!question_statsMap[question_id]) {
        question_statsMap[question_id] = {
          question_id,
          answer_count: 0,
          answer_types: {}
        };
      }

      // Update stats
      question_statsMap[question_id].answer_count++;
      
      const answerValue = answer.text || 
                         answer.choice?.label || 
                         answer.choices?.labels?.join(', ') || 
                         'unknown';
      question_statsMap[question_id].answer_types[answerValue] = 
        (question_statsMap[question_id].answer_types[answerValue] || 0) + 1;
    });
  });

  // Convert map to array
  for (const question_id in question_statsMap) {
    question_stats.push(question_statsMap[question_id]);
  }

  const drop_off_points: Record<string, number> = {}

  responses.items.forEach((response: any) => {
    // Track answers
    response.answers?.forEach((answer: any) => {
      const question_id = answer.field.id
      question_stats[question_id] = question_stats[question_id] || {
        answer_count: 0,
        answer_types: {}
      }
      question_stats[question_id].answer_count++

      const answerValue = answer.text || 
                         answer.choice?.label || 
                         answer.choices?.labels?.join(', ') || 
                         'unknown'
      question_stats[question_id].answer_types[answerValue] = 
        (question_stats[question_id].answer_types[answerValue] || 0) + 1
    })

    // Track drop-offs
    if (response.answers?.length > 0) {
      const lastQuestion = response.answers[response.answers.length - 1].field.id
      drop_off_points[lastQuestion] = (drop_off_points[lastQuestion] || 0) + 1
    }
  })

  // Format drop-off points
  const formattedDropOffs = Object.entries(drop_off_points)
    .map(([question_id, count]) => ({
      question_id,
      count,
      percentage: Math.round((count / total_responses) * 100 * 10) / 10
    }))
    .sort((a, b) => b.count - a.count)

  return {
    total_responses,
    average_time,
    question_stats,
    drop_off_points: formattedDropOffs,
  }
}