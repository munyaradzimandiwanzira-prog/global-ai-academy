-- Portuguese help in the English course (and any later help language).
--   esl_learners.support       the language Zuva may explain in ('off' or 'pt-MZ'); English practice never changes
--   esl_attempts.support_used  1 when the learner looked at the Portuguese meaning before or during an answer,
--                              so Zuva can fade the help and teachers can see the learner growing independent
ALTER TABLE esl_learners ADD COLUMN support TEXT NOT NULL DEFAULT 'off' CHECK (support IN ('off','pt-MZ'));
ALTER TABLE esl_attempts ADD COLUMN support_used INTEGER NOT NULL DEFAULT 0;
