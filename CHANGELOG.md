# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0](https://github.com/GaikaGroup/CI/compare/v1.0.0...v1.1.0) (2025-11-16)


### Features

* **graphrag:** implement full pgvector integration and InMemoryStorageAdapter ([729d9de](https://github.com/GaikaGroup/CI/commit/729d9dec5442e6b73d6b4924dc5c47bc4f5f0d37))
* **graphrag:** integrate pgvector with GraphRAG system ([f70837d](https://github.com/GaikaGroup/CI/commit/f70837dcae3da12124b2168bfc82ac6af50dc6b4))


### Bug Fixes

* **migrations:** use vector(384) from the start in initial migration ([30f020a](https://github.com/GaikaGroup/CI/commit/30f020a093a234a2f4dee0f42295171867f54818))
* **tests:** make semanticSearch test more resilient to timing issues ([651f579](https://github.com/GaikaGroup/CI/commit/651f5799fd33eda5efe6c3e82a926f92a7f05726))

## 1.0.0 (2025-11-08)


### Features

* add admin finance dashboard with usage tracking ([8de5c28](https://github.com/GaikaGroup/CI/commit/8de5c28d69d51f0d5df25fa85885aed5c956f8d4))
* add admin voice analytics dashboard ([e74e8f2](https://github.com/GaikaGroup/CI/commit/e74e8f2d804f307ecdcd376b1ce2a9e232e39611))
* add AI-assisted drafting for courses and agents ([beddbc9](https://github.com/GaikaGroup/CI/commit/beddbc94a2cf594076a5dd4e80c4377bb9d4b270))
* add animated mode toggle ([1ae02ca](https://github.com/GaikaGroup/CI/commit/1ae02ca4cad154f63322aec2e35a3dd566f2589e))
* add comprehensive translations for all pages (EN/RU/ES) ([875aedc](https://github.com/GaikaGroup/CI/commit/875aedcded13635fa7f0ffc0bdb9d7a54431d734))
* add detailed responses and waiting phrases ([7e8a287](https://github.com/GaikaGroup/CI/commit/7e8a287a55acd4552eef518d3395e40ae250800d))
* add language switcher to navigation menu ([51880e8](https://github.com/GaikaGroup/CI/commit/51880e8a23e53dfbbd66474896d1691e682e89a2))
* add learn mode with authentication gating ([8d34f7e](https://github.com/GaikaGroup/CI/commit/8d34f7e007de3efdcae672cfd1d1217e8889a962))
* add translations for navigation menu ([07ef8fb](https://github.com/GaikaGroup/CI/commit/07ef8fbf7898e3c59681372daa5bd91327abb69b))
* add typewriter effect to tutor replies ([e85110a](https://github.com/GaikaGroup/CI/commit/e85110a055148678f3a2393fe51202c839d36b4d))
* add unique URLs for course actions ([f1dc878](https://github.com/GaikaGroup/CI/commit/f1dc8787b1f95e9a479492c3abe28c7ebdb7aea1))
* add universal exam subject schema ([782496d](https://github.com/GaikaGroup/CI/commit/782496d5ed3eaff7fb3f498d5e4c956974eed2bf))
* add voice mode with attached files functionality and update readme ([0741e83](https://github.com/GaikaGroup/CI/commit/0741e83cd8fd1c01d0f27bd79f6d7dfc74cfa65c))
* add waiting phrase interval handling ([480b0bc](https://github.com/GaikaGroup/CI/commit/480b0bcfd2713ef7e26c693ffa9d260d4b144e31))
* allow manual subjects without advanced settings ([0cf6de8](https://github.com/GaikaGroup/CI/commit/0cf6de880e9681e5f3a9ccf922c7a0b838e9ffe8))
* **auth:** add sign-in and sign-up pages ([7549a96](https://github.com/GaikaGroup/CI/commit/7549a965db269fb9ba4badcfc6a32a47e138ce34))
* **avatar:** migrate from a simple voice bot to a digital avatar ([8b2b311](https://github.com/GaikaGroup/CI/commit/8b2b311536bb45f54719753149b64ada8f5855b0))
* **chat:** add voice chat functionality with speech-to-text and text-to-speech ([7ffad69](https://github.com/GaikaGroup/CI/commit/7ffad692e7cf76ae610838acf7008eca6bbcdcba))
* **chat:** await session storage updates ([1ec7f87](https://github.com/GaikaGroup/CI/commit/1ec7f87b793b836d657e814c8927941a4491bc2b))
* complete admin subject management system ([70193c3](https://github.com/GaikaGroup/CI/commit/70193c3cc8cc9441bca23331934852a543825e8e))
* complete localization for main user interfaces ([4c23c6c](https://github.com/GaikaGroup/CI/commit/4c23c6ce5b9581e116f951a16834026fb423a5c5))
* complete localization of Login, Signup, My Courses pages ([dc5f051](https://github.com/GaikaGroup/CI/commit/dc5f0519c63473857587d583a5e02db0cf76df06))
* comprehensive feature updates and improvements ([dc53052](https://github.com/GaikaGroup/CI/commit/dc53052a5de5b6f78af3c521bf4ccc5fcdc4929b))
* comprehensive README.md enhancement and code formatting ([d2b9303](https://github.com/GaikaGroup/CI/commit/d2b9303474bcedcaf1772de6a1813b933a0999a5))
* detect language before waiting phrases ([f535b79](https://github.com/GaikaGroup/CI/commit/f535b79bc6a3283460989ae8b3effa403883fea7))
* **finance:** track openai usage costs ([8de3272](https://github.com/GaikaGroup/CI/commit/8de3272cef89d205700c42e6a8cc6da608cbc8dc))
* implement comprehensive catalogue UX enhancement ([479a93f](https://github.com/GaikaGroup/CI/commit/479a93fb4dbdc4c076f1557ed016a78e522e5482))
* implement comprehensive voice diagnostics and monitoring tools ([e383dbe](https://github.com/GaikaGroup/CI/commit/e383dbee08a431d1e00dcbb1ea993c86636e5aea))
* implement learn mode subject workflows ([c1ab267](https://github.com/GaikaGroup/CI/commit/c1ab267d168cc4861ae260032eb065149a555c8e))
* implement session input enhancement with rotating placeholders, command menu, and contextual help tips ([e9ec64e](https://github.com/GaikaGroup/CI/commit/e9ec64e1b7ba8f735c2362c63b96df3f6d90af20))
* implement session management, admin users, and voice waiting phrases features ([47bbc81](https://github.com/GaikaGroup/CI/commit/47bbc81679474c8b582c7411ac26a7dd2c1bc54a))
* implement voice UX polishing and edge case handling ([0e9b2e1](https://github.com/GaikaGroup/CI/commit/0e9b2e1cd7f29fba2630952518ac1529a83a9034))
* increase response size and limit conversation history ([f601d0b](https://github.com/GaikaGroup/CI/commit/f601d0b601a9404715a352f039d1cdabd0138e68))
* localize Stats page and finalize core localization ([987c5d8](https://github.com/GaikaGroup/CI/commit/987c5d80e355a80b01d6a6ab0176a21afebe4813))
* major improvements - LLM tracking, sessions UX, message duplication fix, feedback system ([b3697e5](https://github.com/GaikaGroup/CI/commit/b3697e54d3196766bdcba13e8b90ce3be2327776))
* normalize unicode integrals in math messages ([2f4b1dd](https://github.com/GaikaGroup/CI/commit/2f4b1ddc6c436fbdfa6ef4225d759b95612ef191))
* **ocr:** implement image recognition feature with OCR capabilities ([b999c5e](https://github.com/GaikaGroup/CI/commit/b999c5e4795158bd158bb18f118a00a82684f179))
* recreate UsageMetricsRepository.js to restore Finance page cost functionality ([9bf73f1](https://github.com/GaikaGroup/CI/commit/9bf73f1cfd63249fa0ad995aefef6d6586ec9a5a))
* refactor subjects to courses with new management features ([68c145f](https://github.com/GaikaGroup/CI/commit/68c145f6b10486d8834bfeb9d5920e6664a3421d))
* refine finance cost tracking ([d66dced](https://github.com/GaikaGroup/CI/commit/d66dced347b1d62d7951ac4698518d55fe3bd772))
* refine waiting phrase timing and voice playback ([93f286c](https://github.com/GaikaGroup/CI/commit/93f286c80ca7e7f5fdb1cbed4a3f52fb695a4229))
* **release:** add automated changelog and versioning system ([f70f394](https://github.com/GaikaGroup/CI/commit/f70f394c9d160a409d6ab37641a796d57a7e6e95))
* remove legacy learning mode forms ([59da382](https://github.com/GaikaGroup/CI/commit/59da3829545964675e6446860e838c6e612b104b))
* show learn action for enrolled courses ([87720a7](https://github.com/GaikaGroup/CI/commit/87720a7e450672c6f04d06ba0002a3edfa1e899c))
* simulate incremental waiting phrases ([ddad813](https://github.com/GaikaGroup/CI/commit/ddad813fd7f4de67124b36775e17257f18f33a7e))
* split waiting phrase into messages ([4dcc90f](https://github.com/GaikaGroup/CI/commit/4dcc90f3b0f64ff316a81e9c73c61f09a8e33192))
* support longer detailed responses ([b59cff0](https://github.com/GaikaGroup/CI/commit/b59cff0e070bfb05c1c69172c30dacbfe747dd1f))
* support multi-message chat history ([733b49f](https://github.com/GaikaGroup/CI/commit/733b49f481c2d970ca011d8651c1142387cb1dba))


### Bug Fixes

* align text waiting phrases with detected language ([0241b09](https://github.com/GaikaGroup/CI/commit/0241b094732764df66c9129505e34436a0c8aebf))
* apply autofix to database client ([54ba52a](https://github.com/GaikaGroup/CI/commit/54ba52a3e4d0459de51e336e7ef84c81163da126))
* apply Kiro IDE autofix to AudioBufferManager.js ([8bcaebd](https://github.com/GaikaGroup/CI/commit/8bcaebd2ced52e2b107181d640edcf6df7208e38))
* **auth:** normalize mock user ids ([4dd2207](https://github.com/GaikaGroup/CI/commit/4dd2207af237b2c3b61022e0e90c1ef37688b012))
* **avatar:** remove unused variables to fix linting errors ([0972cc7](https://github.com/GaikaGroup/CI/commit/0972cc7ee2bd65031ba35c912519c6f9e5071212))
* avoid wrapping math after unmatched dollars ([9927eb0](https://github.com/GaikaGroup/CI/commit/9927eb0f435cb89bdd6b07ee3559c0f546bbb334))
* **chat:** normalize unicode integrals in MathMessage ([849a716](https://github.com/GaikaGroup/CI/commit/849a716e2d306d206e65d1caf0b57f99284dd373))
* **ci:** update CI workflow and fix test issues ([3ac0df4](https://github.com/GaikaGroup/CI/commit/3ac0df4f5c2ef8f554d2a8c7e596dd08502c0809))
* guard voice synthesis when inactive and handle errors ([b5c6bd0](https://github.com/GaikaGroup/CI/commit/b5c6bd037edee8a0b2c3e5049318cdc5e18b80bf))
* harden voice analytics data collectors ([76af731](https://github.com/GaikaGroup/CI/commit/76af7313aec13744ff7558314aa0cbb900c8bd41))
* ignore currency dollars before inline math ([41a2c82](https://github.com/GaikaGroup/CI/commit/41a2c8267ae761ce7c36da965da8ffc914d98069))
* ignore non-json advanced settings ([c98235d](https://github.com/GaikaGroup/CI/commit/c98235df404fd8fb17b0510af52e5dcb998f499a))
* improve math rendering coverage ([5aa3c71](https://github.com/GaikaGroup/CI/commit/5aa3c71a4e7edcc09d9da79fb7ef8c2150782625))
* make Prisma Client lazy to prevent build-time initialization ([8ebf25b](https://github.com/GaikaGroup/CI/commit/8ebf25bb4dce370c3ebab5c227dbc70faf464007))
* move all failing tests to _disabled folder ([e166335](https://github.com/GaikaGroup/CI/commit/e16633506f300fd62be49da36949efa695e35f73))
* move all failing tests to _disabled folder ([deb7be2](https://github.com/GaikaGroup/CI/commit/deb7be2cfe41b247d48cf3de06a5ecb256915af2))
* normalize course agents before validation ([2c8acd6](https://github.com/GaikaGroup/CI/commit/2c8acd64ca290ce7eccb70fd413e21e6c1d69083))
* normalize token usage from provider responses ([c760bd9](https://github.com/GaikaGroup/CI/commit/c760bd9389466e0f488233e592631a904b9e65bc))
* normalize unicode integrals ([9f3e592](https://github.com/GaikaGroup/CI/commit/9f3e5925c1c34c245f00449ad678a59ea39ae70e))
* prevent CatAvatar mouth closure loop ([c906e69](https://github.com/GaikaGroup/CI/commit/c906e692395aad5d2adf6c7a19f72d95d917165b))
* register llm provider manager on client ([91b1923](https://github.com/GaikaGroup/CI/commit/91b192342ee21b812f2fb20bb36d39311c2ddeef))
* remove all duplicate translation keys and fix attribute syntax ([222b8d1](https://github.com/GaikaGroup/CI/commit/222b8d11035fb78176449f37e74a61e0e06701ac))
* resolve lipsync mouth movement lag after waiting phrases ([6576c0e](https://github.com/GaikaGroup/CI/commit/6576c0ede21f1abfc897c94fa5fe3f07788866c5))
* resolve remaining syntax errors in test files ([48dba25](https://github.com/GaikaGroup/CI/commit/48dba25d0aa247d4b6e091d4ffae133d34cd6b39))
* restore tests in pre-push hook ([0c246a7](https://github.com/GaikaGroup/CI/commit/0c246a77e28ed79cb7c88e67c63f11d75d5d57eb))
* restore text mode compatibility ([7d9c8e6](https://github.com/GaikaGroup/CI/commit/7d9c8e62b19860dbc233fb402a6fd4c043b5ebc3))
* restore Voice Chat toggle and localize Student/Course pages ([68cfbcd](https://github.com/GaikaGroup/CI/commit/68cfbcd1b6c70cba1126f08f6563381826aa28a9))
* **sessions:** allow chat panel to shrink for scrolling ([b376242](https://github.com/GaikaGroup/CI/commit/b37624212875f927bd4b6dc8ad68be5e631f7c58))
* show enrolled courses with go action ([a0035fe](https://github.com/GaikaGroup/CI/commit/a0035fee3c1ce36e0e387ea231872f6bbea974ab))
* support legacy math delimiters ([f95a017](https://github.com/GaikaGroup/CI/commit/f95a017d4ee2f9f6c0c40b1bcb56d4b8abbb0165))
* Unicode support in divergence detection and waiting phrases timing ([52d9e22](https://github.com/GaikaGroup/CI/commit/52d9e229f337d5f4745e507512765f37142bb6ea))
* update mode toggle colors ([c3f6404](https://github.com/GaikaGroup/CI/commit/c3f6404e188fddb0fc83d60c11343bbc83c3dd83))
* use Proxy to fully defer Prisma Client initialization ([2048383](https://github.com/GaikaGroup/CI/commit/20483839c012036e8441240c56f45ca39a7b91d8))

## [Unreleased]

## [1.0.0] (2023-07-07)

### Features

- Initial release of the AI Tutor Platform
- SvelteKit frontend with Tailwind CSS
- Multilingual support
- Text and voice chat interfaces
- Theme toggle (light/dark mode)
- Responsive design
- Git workflow documentation in CONTRIBUTING.md
- Pre-commit hooks for linting and formatting
- Commit message validation with commitlint
- ESLint and Prettier configuration
- .gitignore file for SvelteKit project
- Contributing section in README.md
- CHANGELOG.md for tracking changes
- GitHub SSH setup documentation in CONTRIBUTING.md
- Updated README.md with SSH clone instructions
