import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Flag, CheckCircle, XCircle } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { lessons } from "../data/lessons";
import ProgressBar from "../components/ui/ProgressBar";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Card from "../components/ui/Card";

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
  exit:    { opacity: 0, y: -10, transition: { duration: 0.2 } },
};

function LessonList({ onSelect }) {
  const [completed] = useState([]);
  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="px-4 md:px-6 py-6">
      <div className="mb-6">
        <span className="section-label">Financial Education</span>
        <h1 className="text-2xl font-outfit font-extrabold text-[var(--text-primary)] mt-1">Learn</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Master bookkeeping basics in bite-sized lessons.</p>
      </div>
      <div className="space-y-3">
        {lessons.map((lesson, i) => {
          const isDone = completed.includes(lesson.id);
          return (
            <motion.div key={lesson.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}>
              <Card hover onClick={() => onSelect(lesson.id)}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ background: "var(--bg-raised)", border: "1px solid var(--border)" }}>{lesson.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-outfit font-bold text-[var(--text-primary)] text-sm truncate">{lesson.title}</span>
                      {isDone && <Badge variant="teal">✓ Done</Badge>}
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mb-2">{lesson.description}</p>
                    <div className="flex items-center gap-3">
                      <ProgressBar value={isDone ? 100 : 0} max={100} height="sm" />
                      <span className="text-[10px] text-[var(--text-muted)] whitespace-nowrap">{lesson.estimatedTime}</span>
                    </div>
                  </div>
                  <span style={{ color: "var(--teal)" }} className="text-sm font-semibold font-outfit flex-shrink-0">Start →</span>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

function ContentScreen({ screen }) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-outfit font-bold text-[var(--text-primary)]">{screen.heading}</h2>
      <div className="text-[var(--text-secondary)] text-sm leading-relaxed space-y-3">
        {screen.body.split("\n\n").map((para, i) => {
          if (para.startsWith("•") || para.includes("\n•")) {
            const lines = para.split("\n").filter(Boolean);
            return (
              <ul key={i} className="space-y-1">
                {lines.map((line, j) => (
                  <li key={j} className="flex gap-2">
                    <span style={{ color: "var(--teal)" }}>•</span>
                    <span>{line.replace("•", "").trim()}</span>
                  </li>
                ))}
              </ul>
            );
          }
          return <p key={i} dangerouslySetInnerHTML={{ __html: para.replace(/\*\*(.*?)\*\*/g, '<strong class="text-[var(--text-primary)] font-semibold">$1</strong>') }} />;
        })}
      </div>
    </div>
  );
}

function QuizScreen({ screen, onAnswer }) {
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const isCorrect = selected === screen.correct;

  const handleSelect = (i) => {
    if (revealed) return;
    setSelected(i);
    setRevealed(true);
    setTimeout(() => onAnswer(i === screen.correct), 200);
  };

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl text-sm text-[var(--text-secondary)] leading-relaxed"
        style={{ background: "var(--bg-raised)", border: "1px solid var(--border)" }}>{screen.scenario}</div>
      <p className="font-outfit font-bold text-[var(--text-primary)]">{screen.question}</p>
      <div className="space-y-2">
        {screen.options.map((opt, i) => {
          let borderColor = "var(--border)", bg = "var(--bg-surface)", textColor = "var(--text-secondary)", icon = null;
          if (revealed) {
            if (i === screen.correct) { borderColor = "var(--teal)"; bg = "var(--teal-dim)"; textColor = "var(--text-primary)"; icon = <CheckCircle size={16} style={{ color: "var(--teal)" }} />; }
            else if (i === selected && i !== screen.correct) { borderColor = "var(--danger)"; bg = "rgba(255,59,59,0.1)"; textColor = "var(--text-primary)"; icon = <XCircle size={16} style={{ color: "var(--danger)" }} />; }
          } else if (selected === i) { borderColor = "var(--teal)"; bg = "var(--teal-dim)"; textColor = "var(--text-primary)"; }
          return (
            <motion.button key={i} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm transition-all duration-200"
              style={{ background: bg, border: `1px solid ${borderColor}`, color: textColor }}
              onClick={() => handleSelect(i)} whileTap={!revealed ? { scale: 0.99 } : {}}>
              <span className="w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center"
                style={{ borderColor: revealed && i === screen.correct ? "var(--teal)" : borderColor }}>{icon}</span>
              {opt}
            </motion.button>
          );
        })}
      </div>
      <AnimatePresence>
        {revealed && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="p-4 rounded-xl text-sm leading-relaxed border-l-2"
              style={{ background: isCorrect ? "rgba(0,255,209,0.06)" : "rgba(255,59,59,0.08)", borderColor: isCorrect ? "var(--teal)" : "var(--danger)", color: "var(--text-secondary)" }}>
              <div className="font-outfit font-bold mb-1" style={{ color: isCorrect ? "var(--teal)" : "var(--danger)" }}>
                {isCorrect ? "✓ Correct!" : "✗ Not quite..."}
              </div>
              {screen.explanation}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LessonEngine({ lessonId, onBack }) {
  const lesson = lessons.find(l => l.id === Number(lessonId));
  const [currentScreen, setCurrentScreen] = useState(0);
  const [quizAnswered, setQuizAnswered] = useState(false);
  const [quizCorrect, setQuizCorrect] = useState(null);

  if (!lesson) return null;
  const screen = lesson.screens[currentScreen];
  const isLast = currentScreen === lesson.screens.length - 1;
  const isQuiz = screen.type === "quiz";
  const canContinue = !isQuiz || quizAnswered;

  const handleNext = () => { if (isLast) { onBack(); return; } setCurrentScreen(p => p + 1); setQuizAnswered(false); setQuizCorrect(null); };
  const handleAnswer = (correct) => { setQuizAnswered(true); setQuizCorrect(correct); };

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit"
      className="flex flex-col min-h-screen" style={{ background: "var(--bg-void)" }}>
      <div className="flex items-center justify-between px-4 py-4 border-b flex-shrink-0"
        style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
        <button onClick={onBack} className="w-9 h-9 flex items-center justify-center rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-raised)] transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 mx-4"><ProgressBar value={currentScreen + 1} max={lesson.screens.length} height="sm" /></div>
        <button className="w-9 h-9 flex items-center justify-center rounded-xl text-[var(--text-muted)] hover:text-[var(--orange)] transition-colors"><Flag size={16} /></button>
      </div>
      <div className="px-4 pt-4 pb-2">
        <span className="section-label">{lesson.title}</span>
        <div className="text-xs text-[var(--text-muted)] mt-0.5">Screen {currentScreen + 1} of {lesson.screens.length}</div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4">
        <AnimatePresence mode="wait">
          <motion.div key={currentScreen} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
            {isQuiz ? <QuizScreen screen={screen} onAnswer={handleAnswer} /> : <ContentScreen screen={screen} />}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="px-4 md:px-6 py-4 border-t" style={{ borderColor: "var(--border)" }}>
        {canContinue ? (
          <Button variant={isQuiz && quizCorrect === false ? "secondary" : "primary"} size="lg" fullWidth onClick={handleNext}>
            {isLast ? "Finish Lesson 🎉" : "Continue →"}
          </Button>
        ) : (
          <Button variant="ghost" size="lg" fullWidth disabled>Choose an answer to continue</Button>
        )}
      </div>
    </motion.div>
  );
}

export default function Learn() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeLessonId, setActiveLessonId] = useState(id ? Number(id) : null);

  if (activeLessonId) {
    return <LessonEngine lessonId={activeLessonId} onBack={() => { setActiveLessonId(null); navigate("/learn"); }} />;
  }
  return <LessonList onSelect={(lid) => { setActiveLessonId(lid); navigate(`/learn/${lid}`); }} />;
}
