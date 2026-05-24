/**
 * codeExecutor.js
 * Docker-based sandboxed code execution engine — LeetCode style
 *
 * Flow:
 *   candidateCode + driverCode → combined file → Docker → stdout/stderr
 *
 * Input injection (no stdin):
 *   Python/JS  → __RAW_INPUT__ variable injected at top of combined code
 *   Java/C++   → __INPUT__ placeholder replaced directly in code
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { promisify } = require('util');

const execAsync = promisify(exec);

// ─── Language Configuration ───────────────────────────────────────────────────
const LANGUAGE_CONFIG = {
  python: {
    image: 'python:3.11-alpine',
    filename: 'solution.py',
    compileCmd: null,
    runCmd: 'python3 solution.py',
  },
  javascript: {
    image: 'node:18-alpine',
    filename: 'solution.js',
    compileCmd: null,
    runCmd: 'node solution.js',
  },
  java: {
    image: 'openjdk:17-alpine',
    filename: 'Solution.java',
    compileCmd: 'javac -d /tmp Solution.java',
    runCmd: 'java -cp /tmp Solution',
  },
  cpp: {
    image: 'gcc:latest',
    filename: 'solution.cpp',
    compileCmd: 'g++ -o /tmp/solution solution.cpp',
    runCmd: '/tmp/solution',
  },
};

const TIMEOUT_SECONDS = 10;
const MEMORY_LIMIT = '128m';
const CPU_LIMIT = '0.5';

// ─── Normalize path for Docker on Windows ────────────────────────────────────
function normalizeMountPath(p) {
  let normalized = p.replace(/\\/g, '/');
  if (/^[A-Za-z]:\//.test(normalized)) {
    normalized = '/' + normalized[0].toLowerCase() + normalized.slice(2);
  }
  return normalized;
}

// ─── Combine candidate code + driver code with input injected ─────────────────
function buildCombinedCode(language, candidateCode, driverCode, inputValue) {
  const hasDriver = driverCode && driverCode.trim().length > 0;

  if (language === 'python') {
    if (hasDriver) {
      // Inject __RAW_INPUT__ at very top so driver can use it
      // Triple-quoted string handles newlines and special chars safely
      const safe = inputValue.replace(/\\/g, '\\\\').replace(/"""/g, '\\"\\"\\"');
      return `__RAW_INPUT__ = """${safe}"""\n\n${candidateCode}\n\n${driverCode}`;
    }
    // No driver: traditional __INPUT__ replacement (fallback)
    return candidateCode.replace(/__INPUT__/g, inputValue);
  }

  if (language === 'javascript') {
    if (hasDriver) {
      // Inject __RAW_INPUT__ as JSON string constant at top
      return `const __RAW_INPUT__ = ${JSON.stringify(inputValue)};\n\n${candidateCode}\n\n${driverCode}`;
    }
    return candidateCode.replace(/__INPUT__/g, inputValue);
  }

  if (language === 'java' || language === 'cpp') {
    // For Java/C++: driver is usually empty; __INPUT__ replaced in template
    const combined = hasDriver
      ? `${candidateCode}\n\n${driverCode}`
      : candidateCode;
    return combined.replace(/__INPUT__/g, inputValue);
  }

  return candidateCode;
}

// ─── Build docker run command (no stdin) ─────────────────────────────────────
function buildDockerCommand(config, tempDir, runId) {
  const containerName = `tp_exec_${runId}`;
  const mountPath = normalizeMountPath(tempDir);

  const flags = [
    `--name ${containerName}`,
    '--rm',
    '--network none',
    `--memory ${MEMORY_LIMIT}`,
    `--memory-swap ${MEMORY_LIMIT}`,
    `--cpus ${CPU_LIMIT}`,
    '--tmpfs /tmp:size=16m',
    `-v "${mountPath}:/code:ro"`,
    '-w /code',
  ].join(' ');

  const runCommand = config.compileCmd
    ? `sh -c "${config.compileCmd} 2>&1 && ${config.runCmd}"`
    : `sh -c "${config.runCmd}"`;

  return `docker run ${flags} ${config.image} ${runCommand}`;
}

// ─── Execute combined code ────────────────────────────────────────────────────
async function executeCode(language, combinedCode) {
  const langKey = language.toLowerCase();
  const config = LANGUAGE_CONFIG[langKey];

  if (!config) {
    throw new Error(`Unsupported language: ${language}`);
  }

  const runId = crypto.randomBytes(8).toString('hex');
  const tempDir = path.join(os.tmpdir(), `tp_${runId}`);
  fs.mkdirSync(tempDir, { recursive: true });

  try {
    fs.writeFileSync(path.join(tempDir, config.filename), combinedCode, 'utf8');

    const dockerCmd = buildDockerCommand(config, tempDir, runId);

    const { stdout, stderr } = await execAsync(dockerCmd, {
      timeout: (TIMEOUT_SECONDS + 3) * 1000,
      maxBuffer: 1024 * 512,
    });

    return {
      success: true,
      stdout: (stdout || '').trim(),
      stderr: (stderr || '').trim(),
      timedOut: false,
      error: null,
    };
  } catch (err) {
    if (err.killed || err.signal === 'SIGTERM' || err.code === 'ETIMEDOUT') {
      return {
        success: false,
        stdout: '',
        stderr: '',
        timedOut: true,
        error: 'Time Limit Exceeded',
      };
    }

    return {
      success: false,
      stdout: (err.stdout || '').trim(),
      stderr: (err.stderr || err.message || '').trim(),
      timedOut: false,
      error: (err.stderr || err.message || 'Execution failed').trim(),
    };
  } finally {
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (_) {}
  }
}

// ─── Run against all test cases ───────────────────────────────────────────────
async function runAgainstTestCases(language, candidateCode, driverCode, testCases) {
  const results = [];

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    const inputValue = (tc.input || '').trim();
    const combinedCode = buildCombinedCode(language, candidateCode, driverCode, inputValue);

    const result = await executeCode(language, combinedCode);

    const actualOutput = (result.stdout || '').trim();
    const expectedOutput = (tc.expected_output || '').trim();
    const passed = result.success && actualOutput === expectedOutput;

    results.push({
      testCaseIndex: i + 1,
      input: tc.input || '',
      expectedOutput: tc.is_hidden ? '(hidden)' : expectedOutput,
      actualOutput: result.timedOut ? 'Time Limit Exceeded' : actualOutput,
      stderr: result.stderr || '',
      error: result.error || null,
      passed,
      timedOut: result.timedOut,
      isHidden: tc.is_hidden || false,
    });
  }

  const passedCount = results.filter(r => r.passed).length;

  return {
    results,
    passedCount,
    totalCount: testCases.length,
    allPassed: passedCount === testCases.length,
  };
}

// ─── Check Docker is available ────────────────────────────────────────────────
async function checkDockerAvailable() {
  try {
    await execAsync('docker --version');
    return true;
  } catch {
    return false;
  }
}

module.exports = { runAgainstTestCases, checkDockerAvailable };