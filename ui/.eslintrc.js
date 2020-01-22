module.exports = {
    root: true,
    env: {
        node: true
    },
    'extends': [
        'plugin:vue/essential',
        'eslint:recommended'
    ],
    rules: {
        'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'off',
        'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
        "vue/no-use-v-if-with-v-for": ["error", {
            "allowUsingIterationVar": true
        }],
        'vue/no-parsing-error': [2, {
            "invalid-first-character-of-tag-name": false
        }]
    },
    parserOptions: {
        parser: 'babel-eslint'
    }
}
