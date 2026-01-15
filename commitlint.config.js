export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // Neue Funktion
        'fix',      // Bugfix
        'docs',     // Dokumentation
        'style',    // Formatierung (kein Code-Change)
        'refactor', // Refactoring
        'perf',     // Performance
        'test',     // Tests
        'chore',    // Wartung
        'ci',       // CI/CD
        'build',    // Build-System
        'revert'    // Revert
      ]
    ],
    'subject-case': [2, 'never', ['start-case', 'pascal-case', 'upper-case']],
    'subject-empty': [2, 'never'],
    'type-empty': [2, 'never']
  }
};
