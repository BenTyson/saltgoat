<script lang="ts">
  import type { RecommenderPeak } from '../../../routes/learn/first-fourteener/+page.server';

  interface Props {
    peaks: RecommenderPeak[];
  }

  let { peaks }: Props = $props();

  // Quiz state
  type QuizStep = 'intro' | 'questions' | 'results';
  let step = $state<QuizStep>('intro');
  let currentQuestion = $state(0);
  let answers = $state<Record<string, string>>({});

  const questions = [
    {
      id: 'experience',
      question: 'Have you hiked at high altitude before?',
      options: [
        { value: 'none', label: "No, this would be my first time above 10,000'" },
        { value: 'some', label: "Yes, I've done some high-altitude hiking" },
        { value: 'experienced', label: "Yes, I'm comfortable at altitude" }
      ]
    },
    {
      id: 'fitness',
      question: 'How would you describe your fitness level?',
      options: [
        { value: 'moderate', label: 'I can hike 5-6 miles with moderate elevation' },
        { value: 'good', label: 'I regularly hike 8+ miles with significant gain' },
        { value: 'strong', label: "I'm very fit and comfortable with long, steep hikes" }
      ]
    },
    {
      id: 'exposure',
      question: 'How do you feel about exposed terrain?',
      options: [
        { value: 'avoid', label: 'I prefer clear trails with no drop-offs' },
        { value: 'moderate', label: 'Some exposure is fine if the trail is solid' },
        { value: 'comfortable', label: "I'm comfortable with scrambling and steep terrain" }
      ]
    },
    {
      id: 'time',
      question: 'How much time can you dedicate to the hike?',
      options: [
        { value: 'short', label: '4-6 hours (shorter routes)' },
        { value: 'medium', label: '6-8 hours (moderate routes)' },
        { value: 'long', label: '8+ hours (longer adventures)' }
      ]
    },
    {
      id: 'vehicle',
      question: 'What vehicle will you have access to?',
      options: [
        { value: 'car', label: 'Regular car (paved/good dirt roads only)' },
        { value: 'suv', label: 'SUV or truck (some rough roads OK)' },
        { value: '4wd', label: 'High-clearance 4WD (any road)' }
      ]
    }
  ];

  function startQuiz() {
    step = 'questions';
    currentQuestion = 0;
    answers = {};
  }

  function selectAnswer(value: string) {
    answers[questions[currentQuestion].id] = value;

    if (currentQuestion < questions.length - 1) {
      currentQuestion++;
    } else {
      step = 'results';
    }
  }

  function goBack() {
    if (currentQuestion > 0) {
      currentQuestion--;
    } else {
      step = 'intro';
    }
  }

  function resetQuiz() {
    step = 'intro';
    currentQuestion = 0;
    answers = {};
  }

  // Scoring logic
  function scorePeak(peak: RecommenderPeak): { score: number; reasons: string[] } {
    const route = peak.standard_route;
    if (!route) return { score: -100, reasons: [] };

    let score = 0;
    const reasons: string[] = [];

    // Difficulty class scoring based on experience and exposure comfort
    if (answers.exposure === 'avoid') {
      if (route.difficulty_class === 1) {
        score += 35;
        reasons.push('Class 1 trail hiking - no scrambling needed');
      } else if (route.difficulty_class === 2) {
        score += 15;
      } else {
        score -= 30;
      }
    } else if (answers.exposure === 'moderate') {
      if (route.difficulty_class <= 2) {
        score += 25;
        reasons.push('Moderate terrain within your comfort zone');
      }
    } else {
      score += 10; // Comfortable with anything
    }

    // Experience scoring
    if (answers.experience === 'none') {
      if (route.difficulty_class === 1) {
        score += 25;
        reasons.push('Great for first-time high altitude hiking');
      } else if (route.difficulty_class >= 3) {
        score -= 40;
      }
    }

    // Fitness/elevation gain scoring
    const gain = route.elevation_gain_ft;
    if (answers.fitness === 'moderate') {
      if (gain < 3000) {
        score += 25;
        reasons.push(`Manageable ${gain.toLocaleString()}' elevation gain`);
      } else if (gain < 3500) {
        score += 10;
      } else {
        score -= 15;
      }
    } else if (answers.fitness === 'good') {
      if (gain < 4000) {
        score += 20;
      }
    } else {
      score += 10; // Strong fitness handles anything
    }

    // Time scoring
    const timeStr = route.typical_time_hours || '';
    const timeMatch = timeStr.match(/(\d+)/);
    const estimatedTime = timeMatch ? parseInt(timeMatch[1]) : 6;

    if (answers.time === 'short') {
      if (estimatedTime <= 6) {
        score += 20;
        reasons.push(`Quick summit at ${timeStr} round trip`);
      } else {
        score -= 20;
      }
    } else if (answers.time === 'medium') {
      if (estimatedTime <= 8) {
        score += 15;
      }
    }

    // Vehicle scoring
    if (route.four_wd_required) {
      if (answers.vehicle === '4wd') {
        score += 5;
      } else {
        score -= 50; // Disqualify if no 4WD
        reasons.push('Requires 4WD vehicle');
      }
    } else {
      if (answers.vehicle === 'car') {
        score += 15;
        if (!reasons.some((r) => r.includes('access'))) {
          reasons.push('Easy road access - no 4WD needed');
        }
      }
    }

    // Exposure scoring
    const exposure = route.exposure?.toLowerCase() || 'low';
    if (answers.exposure === 'avoid') {
      if (exposure === 'low' || exposure === 'none') {
        score += 15;
        reasons.push('Low exposure - stays on solid ground');
      } else if (exposure === 'high' || exposure === 'extreme') {
        score -= 30;
      }
    }

    // Bonus for well-known beginner peaks
    const beginnerFriendly = ['quandary-peak', 'mt-bierstadt', 'grays-peak', 'torreys-peak', 'mt-elbert', 'mt-sherman'];
    if (beginnerFriendly.includes(peak.slug)) {
      score += 10;
      if (!reasons.some((r) => r.includes('popular'))) {
        reasons.push('Popular choice for first-timers');
      }
    }

    return { score, reasons };
  }

  const recommendations = $derived(() => {
    if (step !== 'results') return [];

    const scored = peaks
      .map((peak) => {
        const { score, reasons } = scorePeak(peak);
        return { peak, score, reasons };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    return scored;
  });

  // Progress helpers
  const progressPercent = $derived(((currentQuestion + 1) / questions.length) * 100);

  // Class colors
  const classColors: Record<number, { bg: string; text: string }> = {
    1: { bg: 'bg-class-1', text: 'text-class-1' },
    2: { bg: 'bg-class-2', text: 'text-class-2' },
    3: { bg: 'bg-class-3', text: 'text-class-3' },
    4: { bg: 'bg-class-4', text: 'text-class-4' }
  };
</script>

<div class="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shadow-card">
  {#if step === 'intro'}
    <!-- Intro screen -->
    <div class="p-8 text-center">
      <div class="w-16 h-16 mx-auto mb-6 rounded-2xl bg-accent/10 flex items-center justify-center">
        <svg class="h-8 w-8 text-accent" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2L2 22h20L12 2zm0 4l7 14H5l7-14z" />
        </svg>
      </div>
      <h3 class="text-2xl font-bold text-slate-900 dark:text-white mb-3">
        Find Your First 14er
      </h3>
      <p class="text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto">
        Answer 5 quick questions and we'll recommend the best peaks for your first summit based on your experience, fitness, and preferences.
      </p>
      <button
        onclick={startQuiz}
        class="px-8 py-3 rounded-xl bg-accent text-mountain-navy font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all"
      >
        Start Quiz
      </button>
    </div>

  {:else if step === 'questions'}
    <!-- Question screen -->
    <div class="p-6">
      <!-- Progress bar -->
      <div class="mb-6">
        <div class="flex justify-between text-sm text-slate-500 dark:text-slate-400 mb-2">
          <span>Question {currentQuestion + 1} of {questions.length}</span>
          <span>{Math.round(progressPercent)}%</span>
        </div>
        <div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
          <div
            class="bg-accent h-2 rounded-full transition-all duration-300"
            style="width: {progressPercent}%"
          ></div>
        </div>
      </div>

      <!-- Question -->
      <h3 class="text-xl font-semibold text-slate-900 dark:text-white mb-6">
        {questions[currentQuestion].question}
      </h3>

      <!-- Options -->
      <div class="space-y-3">
        {#each questions[currentQuestion].options as option}
          <button
            onclick={() => selectAnswer(option.value)}
            class="w-full text-left p-4 rounded-xl border-2 transition-all
              {answers[questions[currentQuestion].id] === option.value
                ? 'border-accent bg-accent/5'
                : 'border-slate-200 dark:border-slate-600 hover:border-accent/50 hover:bg-slate-50 dark:hover:bg-slate-700/50'}"
          >
            <span class="text-slate-700 dark:text-slate-300">{option.label}</span>
          </button>
        {/each}
      </div>

      <!-- Navigation -->
      <div class="mt-8 flex justify-between">
        <button
          onclick={goBack}
          class="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-accent transition-colors"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <div class="flex gap-2">
          {#each questions as _, i}
            <div
              class="w-2.5 h-2.5 rounded-full transition-colors
                {i < currentQuestion ? 'bg-semantic-success' : i === currentQuestion ? 'bg-accent' : 'bg-slate-200 dark:bg-slate-600'}"
            ></div>
          {/each}
        </div>
      </div>
    </div>

  {:else if step === 'results'}
    <!-- Results screen -->
    <div class="p-6">
      <div class="text-center mb-8">
        <div class="w-14 h-14 mx-auto mb-4 rounded-full bg-semantic-success/10 dark:bg-semantic-success/20 flex items-center justify-center">
          <svg class="h-7 w-7 text-semantic-success-dark dark:text-semantic-success-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 class="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          Your Recommendations
        </h3>
        <p class="text-slate-600 dark:text-slate-400">
          Based on your answers, here are the best peaks for your first 14er
        </p>
      </div>

      {#if recommendations().length === 0}
        <div class="text-center py-8">
          <p class="text-slate-600 dark:text-slate-400 mb-4">
            We couldn't find peaks matching all your criteria. Try adjusting your preferences.
          </p>
          <button
            onclick={resetQuiz}
            class="px-6 py-2 rounded-lg bg-accent text-white font-medium hover:bg-accent-warm transition-colors"
          >
            Try Again
          </button>
        </div>
      {:else}
        <div class="space-y-4">
          {#each recommendations() as { peak, reasons }, i}
            <a
              href="/peaks/{peak.slug}"
              class="block rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 overflow-hidden hover:border-accent hover:shadow-card-hover transition-all group"
            >
              <div class="flex gap-4 p-4">
                <!-- Rank badge -->
                <div class="flex-shrink-0 w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                  <span class="text-accent font-bold">#{i + 1}</span>
                </div>

                <!-- Peak image -->
                {#if peak.thumbnail_url || peak.hero_image_url}
                  <div class="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden">
                    <img
                      src={peak.thumbnail_url || peak.hero_image_url}
                      alt={peak.name}
                      class="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                {/if}

                <!-- Peak info -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between gap-2">
                    <div>
                      <h4 class="font-semibold text-slate-900 dark:text-white group-hover:text-accent transition-colors">
                        {peak.name}
                      </h4>
                      <p class="text-sm text-slate-500 dark:text-slate-400">
                        {peak.elevation.toLocaleString()}' · {peak.range}
                      </p>
                    </div>
                    {#if peak.standard_route}
                      <span
                        class="flex-shrink-0 px-2 py-0.5 rounded text-xs font-semibold text-white {classColors[peak.standard_route.difficulty_class]?.bg || 'bg-slate-500'}"
                      >
                        Class {peak.standard_route.difficulty_class}
                      </span>
                    {/if}
                  </div>

                  <!-- Route stats -->
                  {#if peak.standard_route}
                    <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <span>{peak.standard_route.distance_miles} mi</span>
                      <span>{peak.standard_route.elevation_gain_ft.toLocaleString()}' gain</span>
                      {#if peak.standard_route.typical_time_hours}
                        <span>{peak.standard_route.typical_time_hours}</span>
                      {/if}
                    </div>
                  {/if}

                  <!-- Why this peak -->
                  {#if reasons.length > 0}
                    <div class="mt-2">
                      <p class="text-xs text-semantic-success-dark dark:text-semantic-success-light">
                        {reasons.slice(0, 2).join(' · ')}
                      </p>
                    </div>
                  {/if}
                </div>

                <!-- Chevron -->
                <svg
                  class="flex-shrink-0 h-5 w-5 text-slate-400 group-hover:text-accent group-hover:translate-x-1 transition-all self-center"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </a>
          {/each}
        </div>

        <div class="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onclick={resetQuiz}
            class="px-6 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-accent hover:text-accent transition-colors"
          >
            Take Quiz Again
          </button>
          <a
            href="/peaks"
            class="px-6 py-2 rounded-lg bg-accent text-white font-medium hover:bg-accent-warm transition-colors text-center"
          >
            Browse All Peaks
          </a>
        </div>
      {/if}
    </div>
  {/if}
</div>
