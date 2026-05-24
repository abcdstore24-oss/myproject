-- =====================================================
-- TalentProctor Database Schema — v2
-- MySQL 8.0+
-- Adds: organizations, invitations, org_owner role
-- =====================================================

DROP TABLE IF EXISTS monitoring_logs;
DROP TABLE IF EXISTS answers;
DROP TABLE IF EXISTS candidate_questions;
DROP TABLE IF EXISTS test_candidates;
DROP TABLE IF EXISTS questions;
DROP TABLE IF EXISTS sections;
DROP TABLE IF EXISTS tests;
DROP TABLE IF EXISTS invitations;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS organizations;

-- =====================================================
-- 1. ORGANIZATIONS
-- =====================================================
CREATE TABLE organizations (
    org_id      INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    type        ENUM('company','college','school','other') NOT NULL DEFAULT 'company',
    domain      VARCHAR(255),
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 2. USERS
-- =====================================================
CREATE TABLE users (
    user_id       INT AUTO_INCREMENT PRIMARY KEY,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name     VARCHAR(255) NOT NULL,
    role          ENUM('admin','org_owner','recruiter','candidate') NOT NULL,
    phone         VARCHAR(20),
    -- org_id is NULL for admin and candidate accounts
    org_id        INT DEFAULT NULL,
    is_active     BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (org_id) REFERENCES organizations(org_id) ON DELETE SET NULL,
    INDEX idx_email  (email),
    INDEX idx_role   (role),
    INDEX idx_org    (org_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 3. INVITATIONS
--    Org owners invite recruiters via email token.
--    Self-registration for recruiters is disabled.
-- =====================================================
CREATE TABLE invitations (
    invitation_id INT AUTO_INCREMENT PRIMARY KEY,
    token         VARCHAR(255) NOT NULL UNIQUE,
    email         VARCHAR(255) NOT NULL,
    org_id        INT NOT NULL,
    invited_by    INT NOT NULL,
    role          ENUM('recruiter') DEFAULT 'recruiter',
    status        ENUM('pending','accepted','expired') DEFAULT 'pending',
    expires_at    DATETIME NOT NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (org_id)      REFERENCES organizations(org_id) ON DELETE CASCADE,
    FOREIGN KEY (invited_by)  REFERENCES users(user_id)        ON DELETE CASCADE,
    INDEX idx_token  (token),
    INDEX idx_email  (email),
    INDEX idx_org    (org_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 4. TESTS
-- =====================================================
CREATE TABLE tests (
    test_id       INT AUTO_INCREMENT PRIMARY KEY,
    recruiter_id  INT NOT NULL,
    test_title    VARCHAR(255) NOT NULL,
    test_description TEXT,
    duration_minutes INT NOT NULL,
    total_marks   INT DEFAULT 0,

    start_time    DATETIME NOT NULL,
    end_time      DATETIME NOT NULL,

    questions_per_candidate INT DEFAULT NULL,

    enable_webcam              BOOLEAN DEFAULT TRUE,
    enable_second_camera       BOOLEAN DEFAULT FALSE,
    enable_location_tracking   BOOLEAN DEFAULT FALSE,
    allowed_latitude           DECIMAL(10,8),
    allowed_longitude          DECIMAL(11,8),
    location_radius_meters     INT DEFAULT 1000,

    enable_tab_monitoring        BOOLEAN DEFAULT TRUE,
    enable_window_blur_detection BOOLEAN DEFAULT TRUE,
    max_tab_switches             INT DEFAULT 3,

    randomize_questions       BOOLEAN DEFAULT FALSE,
    show_results_immediately  BOOLEAN DEFAULT FALSE,
    passing_percentage        DECIMAL(5,2) DEFAULT 40.00,

    status ENUM('draft','scheduled','active','completed','cancelled') DEFAULT 'draft',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (recruiter_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_recruiter  (recruiter_id),
    INDEX idx_status     (status),
    INDEX idx_start_time (start_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 5. SECTIONS
-- =====================================================
CREATE TABLE sections (
    section_id         INT AUTO_INCREMENT PRIMARY KEY,
    test_id            INT NOT NULL,
    title              VARCHAR(255) NOT NULL,
    description        TEXT,
    order_number       INT NOT NULL DEFAULT 1,
    questions_to_pick  INT DEFAULT NULL,
    time_limit_minutes INT DEFAULT NULL,
    created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (test_id) REFERENCES tests(test_id) ON DELETE CASCADE,
    INDEX idx_section_test  (test_id),
    INDEX idx_section_order (test_id, order_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 6. QUESTIONS
-- =====================================================
CREATE TABLE questions (
    question_id     INT AUTO_INCREMENT PRIMARY KEY,
    test_id         INT NOT NULL,
    section_id      INT DEFAULT NULL,
    question_type   ENUM('mcq','coding') NOT NULL,
    question_number INT NOT NULL,
    question_text   TEXT NOT NULL,

    option_a       TEXT,
    option_b       TEXT,
    option_c       TEXT,
    option_d       TEXT,
    correct_option CHAR(1),

    supported_languages JSON,
    initial_codes       JSON,
    test_cases          JSON,

    marks      INT NOT NULL DEFAULT 1,
    difficulty ENUM('easy','medium','hard') DEFAULT 'medium',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (test_id)    REFERENCES tests(test_id)       ON DELETE CASCADE,
    FOREIGN KEY (section_id) REFERENCES sections(section_id) ON DELETE SET NULL,
    INDEX idx_test    (test_id),
    INDEX idx_section (section_id),
    INDEX idx_type    (question_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 7. TEST_CANDIDATES
-- =====================================================
CREATE TABLE test_candidates (
    assignment_id INT AUTO_INCREMENT PRIMARY KEY,
    test_id       INT NOT NULL,
    candidate_id  INT NOT NULL,

    invited_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    invitation_status  ENUM('pending','accepted','declined') DEFAULT 'pending',

    started_at         DATETIME,
    submitted_at       DATETIME,
    time_taken_minutes INT,

    score         DECIMAL(5,2),
    percentage    DECIMAL(5,2),
    result_status ENUM('pending','pass','fail') DEFAULT 'pending',

    total_tab_switches   INT DEFAULT 0,
    total_window_blurs   INT DEFAULT 0,
    location_verified    BOOLEAN DEFAULT FALSE,
    webcam_verified      BOOLEAN DEFAULT FALSE,
    second_camera_verified BOOLEAN DEFAULT FALSE,

    is_suspicious  BOOLEAN DEFAULT FALSE,
    examiner_notes TEXT,

    FOREIGN KEY (test_id)      REFERENCES tests(test_id)  ON DELETE CASCADE,
    FOREIGN KEY (candidate_id) REFERENCES users(user_id)  ON DELETE CASCADE,
    UNIQUE KEY unique_test_candidate (test_id, candidate_id),
    INDEX idx_test      (test_id),
    INDEX idx_candidate (candidate_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 8. CANDIDATE_QUESTIONS
-- =====================================================
CREATE TABLE candidate_questions (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    assignment_id INT NOT NULL,
    question_id   INT NOT NULL,
    section_id    INT DEFAULT NULL,
    display_order INT NOT NULL DEFAULT 0,

    FOREIGN KEY (assignment_id) REFERENCES test_candidates(assignment_id) ON DELETE CASCADE,
    FOREIGN KEY (question_id)   REFERENCES questions(question_id)         ON DELETE CASCADE,
    UNIQUE KEY unique_candidate_question (assignment_id, question_id),
    INDEX idx_cq_assignment (assignment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 9. ANSWERS
-- =====================================================
CREATE TABLE answers (
    answer_id     INT AUTO_INCREMENT PRIMARY KEY,
    assignment_id INT NOT NULL,
    question_id   INT NOT NULL,

    selected_option   CHAR(1),
    code_answer       TEXT,
    selected_language VARCHAR(50) NULL,

    is_correct     BOOLEAN,
    marks_obtained DECIMAL(5,2) DEFAULT 0,

    time_spent_seconds INT,
    answered_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (assignment_id) REFERENCES test_candidates(assignment_id) ON DELETE CASCADE,
    FOREIGN KEY (question_id)   REFERENCES questions(question_id)         ON DELETE CASCADE,
    UNIQUE KEY unique_answer (assignment_id, question_id),
    INDEX idx_assignment (assignment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 10. MONITORING_LOGS
-- =====================================================
CREATE TABLE monitoring_logs (
    log_id        INT AUTO_INCREMENT PRIMARY KEY,
    assignment_id INT NOT NULL,

    event_type ENUM(
        'tab_switch','window_blur','copy_attempt','paste_attempt',
        'right_click','fullscreen_exit','webcam_snapshot',
        'location_check','suspicious_activity',
        'face_not_detected','multiple_faces_detected',
        'gaze_deviation','cam1_distance_violation','cam2_distance_violation',
        'phone_detected','unauthorised_person_detected'
    ) NOT NULL,

    event_description TEXT,
    severity ENUM('low','medium','high','critical') DEFAULT 'medium',

    snapshot_url VARCHAR(500),
    latitude     DECIMAL(10,8),
    longitude    DECIMAL(11,8),

    user_agent TEXT,
    ip_address VARCHAR(45),

    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (assignment_id) REFERENCES test_candidates(assignment_id) ON DELETE CASCADE,
    INDEX idx_assignment (assignment_id),
    INDEX idx_event_type (event_type),
    INDEX idx_severity   (severity),
    INDEX idx_logged_at  (logged_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- VIEWS
-- =====================================================
CREATE VIEW vw_test_results AS
SELECT
    t.test_id,
    t.test_title,
    u.full_name                                          AS recruiter_name,
    o.name                                               AS org_name,
    COUNT(tc.assignment_id)                              AS total_candidates,
    AVG(tc.percentage)                                   AS avg_percentage,
    SUM(CASE WHEN tc.is_suspicious THEN 1 ELSE 0 END)   AS suspicious_count
FROM tests t
JOIN users u ON t.recruiter_id = u.user_id
LEFT JOIN organizations o ON u.org_id = o.org_id
LEFT JOIN test_candidates tc ON t.test_id = tc.test_id
GROUP BY t.test_id, t.test_title, u.full_name, o.name;

CREATE VIEW vw_candidate_performance AS
SELECT
    u.user_id,
    u.full_name,
    u.email,
    COUNT(tc.assignment_id)        AS tests_taken,
    AVG(tc.percentage)             AS avg_score,
    SUM(tc.total_tab_switches)     AS total_violations
FROM users u
JOIN test_candidates tc ON u.user_id = tc.candidate_id
WHERE u.role = 'candidate'
GROUP BY u.user_id, u.full_name, u.email;

-- =====================================================
-- EVENT SCHEDULER
-- =====================================================
SET GLOBAL event_scheduler = ON;

DELIMITER $$

DROP EVENT IF EXISTS evt_update_test_status$$
CREATE EVENT evt_update_test_status
ON SCHEDULE EVERY 1 MINUTE
STARTS CURRENT_TIMESTAMP
DO
BEGIN
    UPDATE tests SET status = 'active'
    WHERE status = 'scheduled' AND start_time <= NOW() AND end_time > NOW();

    UPDATE tests SET status = 'completed'
    WHERE status IN ('scheduled','active') AND end_time <= NOW();
END$$

DELIMITER ;

-- =====================================================
-- SAMPLE DATA
-- =====================================================

-- Global admin (no org)  — password: Admin@123
INSERT INTO users (email, password_hash, full_name, role) VALUES
('admin@talentproctor.com',
 '$2a$10$/jtOps82JzjEjOSXZl63r./NGFwev19.IgN6kSDJ0FvM5kbEZxbhW',
 'System Admin', 'admin');

-- Sample organization
INSERT INTO organizations (name, type, domain) VALUES
('Tech Corp', 'company', 'techcorp.com');

-- Org owner for Tech Corp  — password: Owner@123
INSERT INTO users (email, password_hash, full_name, role, org_id) VALUES
('owner@techcorp.com',
 '$2a$10$g4ZGoAjfdaIHcsz3We47kuuFAh94EKyfAy4fvDs29ev6Lq81hU9Oi',
 'Tech Corp Owner', 'org_owner', 1);

-- Recruiter under Tech Corp  — password: Recruiter@123
INSERT INTO users (email, password_hash, full_name, role, org_id) VALUES
('recruiter@techcorp.com',
 '$2a$10$g4ZGoAjfdaIHcsz3We47kuuFAh94EKyfAy4fvDs29ev6Lq81hU9Oi',
 'John Recruiter', 'recruiter', 1);

-- Candidates (no org)  — password: Candidate@123
INSERT INTO users (email, password_hash, full_name, role) VALUES
('candidate1@test.com',
 '$2a$10$CHweXYAc/WecFIzQ.FGMMuzV5DMcrlCg5I8fRxDLHvF/RtJ/oG/y2',
 'Alice Candidate', 'candidate'),
('candidate2@test.com',
 '$2a$10$CHweXYAc/WecFIzQ.FGMMuzV5DMcrlCg5I8fRxDLHvF/RtJ/oG/y2',
 'Bob Student', 'candidate');