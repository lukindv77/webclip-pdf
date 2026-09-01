# WebClip — primary PDF fidelity contract

Этот документ задаёт постоянный product/architecture contract текущего основного PDF-режима WebClip. Он конкретизирует `PROJECT_MISSION_AND_DEFENSIVE_SECURITY_POLICY.md` и `WEBCLIP_COPY_ARCHITECTURE_POLICY.md` для PDF и является нормативной основой для deep-research criteria, реализации и regression verification PDF pipeline.

`RESEARCH_REGISTRY.md` остаётся единственным current authority по P-code owner/status. Этот документ сам по себе не меняет P-code status/owner и не утверждает, что текущая реализация уже соответствует всем перечисленным требованиям.

## 1. Scope: PDF является гибридом fidelity и completeness

Текущий основной PDF-режим WebClip — **faithful static PDF**, то есть осознанный гибрид двух целей:

1. максимально сохранить визуальное и структурное состояние явно выбранной пользователем страницы/областей относительно exact admitted document/frame/render state;
2. дать пригодную для последующего чтения статическую копию содержимого выбранного scope, которое пользователь может получить обычным scrolling уже существующего содержимого и раскрытием безопасно материализуемых свёрнутых блоков/spoilers.

PDF не является буквальным screenshot текущего viewport и не является crawler/Reader/архиватором всего потенциально достижимого web-состояния.

Если в будущем WebClip сохраняет ту же страницу в HTML, WARC/WACZ, Reader, screenshot или другом формате/режиме, fidelity/completeness contract для такого формата определяется отдельным явным product decision. Нельзя автоматически переносить этот PDF contract на другой формат.

## 2. Главный invariant

Любое преобразование для PDF допустимо только тогда, когда оно помогает статически представить содержимое, уже принадлежащее пользовательскому scope по правилам этого contract, и не подменяет его другой document/frame/resource/responsive/temporal generation.

Подготовка PDF не имеет права:

- менять пользовательские Include/Exclude;
- подменять source document/frame/application generation;
- выбирать другой responsive вариант только из-за print/A4 geometry;
- заменять admitted image/media/resource generation более поздней или иной generation;
- выполнять page-owned submit/navigation или произвольные clicks ради получения нового содержания;
- автоматически прокручивать live page с целью породить новое логическое содержимое за пределами user-reached boundary;
- включать hover-only состояние;
- скрыто превращать faithful PDF в Reader/simplified representation.

Если требуемая fidelity/completeness не может быть безопасно и доказуемо достигнута в установленных time/node/byte/resource/security пределах, результат должен быть `degraded`/`partial`/`unknown` либо error согласно acceptance contract, но не silent full success.

## 3. Admission boundary

Admitted state фиксируется после того, как пользователь определил Include/Exclude и непосредственно перед тем, как WebClip начинает собственные преобразования для сохранения.

Где это materially влияет на результат, admission/provenance должен быть способен различать:

- exact document/application/frame generation;
- user selection scope и Exclude;
- source viewport width/height, orientation и relevant zoom/device-scale context;
- responsive/media/container-query state;
- source scroll positions и наблюдаемые user-reached scroll boundaries;
- open/closed disclosure state;
- non-hover top-layer/dialog/popover state;
- form/control renderer state;
- resource/currentSrc/media identity и decoded generation, где доступно;
- animation/transition/media temporal state;
- user focus/selection state, если оно materially меняет non-hover presentation.

Состояние, созданное собственными popup/dialog/focus/preparation действиями WebClip после admission, не становится новым пользовательским source state.

## 4. User-selected scope и абсолютный приоритет Exclude

`Include` определяет сохраняемый scope. `Exclude` имеет абсолютный приоритет внутри него.

Static flattening, spoiler expansion, scroll expansion, lazy-resource materialization, frame flattening и любые другие PDF preparation steps не имеют права вернуть descendant/content, который пользователь явно исключил.

Нельзя заменять selected scope эвристическим Reader/main-content результатом даже тогда, когда он кажется более удобным для печати.

## 5. Ordinary scrolling: уже существующее содержимое сохраняется полностью

Если содержимое уже существует в selected document/subtree и доступно пользователю только через обычный scroll, оно является частью PDF completeness envelope даже если конкретный участок не находился в viewport в момент admission.

Это относится к:

- длинной странице;
- `overflow:auto` / `overflow:scroll` контейнерам;
- nested scroll containers;
- таблицам/панелям/спискам, где элементы уже существуют, но видны только после scroll;
- offscreen elements того же конечного DOM/composed-tree content.

Для PDF такой scroll viewport может быть преобразован в complete static flow. Сам scrollbar сохранять необязательно, но ordering, meaningful geometry/style и content не должны произвольно теряться.

Это правило не даёт WebClip права автоматически порождать **новое логическое содержимое**, которое ещё не существовало и появляется только как side effect дальнейшего scroll. Для него действует отдельная user-reached boundary ниже.

## 6. Scroll-triggered dynamic growth: предел задаёт пользователь

Если новое логическое содержимое добавляется, подгружается или заменяется именно вследствие scroll/infinite-scroll/virtualized behavior, WebClip **не должен сам прокручивать live page дальше ради расширения этого множества**.

Предел сохраняемого dynamic-scroll content задаёт пользователь:

- всё такое содержимое, уже присутствующее при начале capture/selection session, считается частью текущего page state;
- во время активной capture/selection session WebClip должен, где технически возможно, учитывать максимальную границу, до которой пользователь сам дошёл scroll-ом на соответствующей странице/контейнере;
- содержимое, materialized/loaded вследствие пользовательского scroll до этой границы, входит в scope PDF completeness;
- содержимое, которое появилось бы только после дополнительного auto-scroll WebClip за user-reached boundary, в текущий PDF contract не входит.

Если пользователь прокрутил dynamic/virtualized список вниз, а затем вернулся вверх, верхняя граница не должна уменьшаться только из-за текущего `scrollTop`.

Для virtualized UI, который переиспользует или удаляет ранее показанные DOM nodes, contract требует стремиться сохранить содержимое, которое уже входило в user-reached range. Если текущая архитектура не может достоверно восстановить ранее materialized/seen content в этой границе, результат должен быть truthfully `partial`/`degraded`/`unknown`, а не считаться complete только потому, что текущий DOM содержит лишь видимое окно.

Для non-converging/infinite content не существует обещания «сохранить всю бесконечную страницу»: completeness ограничена user-reached boundary и общими resource/time/node/byte limits.

## 7. Closed disclosures / spoilers

Закрытый spoiler/`<details>` или семантически эквивалентный свёрнутый блок внутри selected scope считается частью содержимого для последующего чтения, если его содержимое уже доступно для безопасной inert materialization без выполнения page-owned destructive/navigation actions.

Для PDF:

- если disclosure открыт пользователем, его содержимое сохраняется открытым;
- если disclosure закрыт на admission, его содержимое всё равно включается в static PDF в раскрытом inert representation;
- provenance/diagnostics должны, где это materially важно, отличать `sourceState=closed` от `staticRepresentation=expanded`;
- раскрытие выполняется на capture/clone/static representation, а не посредством синтетического page-owned click на live page;
- если содержимое появляется только после потенциально stateful/network/page-owned interaction, WebClip не должен молча выполнять такую interaction; либо пользователь должен сам materialize нужное состояние, либо результат/ограничение классифицируется согласно truthful-degradation policy.

Таким образом, PDF deliberately расширяет safe collapsed content ради later reading, но не утверждает, что пользователь видел этот блок раскрытым на admission.

## 8. Lazy resources versus new logical content

Нужно различать lazy **resource** уже существующего элемента и появление нового logical content.

Если элемент уже входит в selected scope, но его изображение/font/другой ресурс ещё не загружен только из-за lazy/offscreen policy, WebClip должен безопасно стремиться materialize необходимый ресурс в пределах budgets. Его responsive/resource identity должна соответствовать admitted source environment, а не print geometry.

Если сами новые nodes/items появляются только после дальнейшего scroll, действует §6: WebClip не auto-scroll-ит live page дальше user-reached boundary.

## 9. Responsive/environment fidelity

Print geometry не имеет права выбирать новый responsive representation страницы.

PDF должен стремиться сохранять source/admitted:

- viewport-responsive layout semantics;
- media-query state;
- container-query-dependent state;
- orientation-sensitive presentation;
- viewport-unit semantics;
- responsive image candidate/currentSrc identity;
- related resource/layout generation.

После фиксации source representation PDF может масштабировать и пагинировать её. Если выбранный layout шире PDF page, uniform/static scaling предпочтительнее скрытого responsive reflow в другой breakpoint, если только отдельный явный PDF rule не доказывает более faithful representation.

`media: screen` само по себе не доказывает это соответствие.

## 10. Pagination

Pagination является разрешённой format-level transformation.

Она может менять разбиение по листам, но не должна молча менять content/layout semantics, responsive generation, resource identity или user selection.

Целевая последовательность:

`admitted source state -> faithful static representation -> pagination/scaling -> physical PDF`

а не:

`source state -> uncontrolled A4 responsive reflow -> другое page state -> PDF`.

## 11. Fixed / sticky

`fixed`/`sticky` semantics могут быть статически flatten-ены, если буквальное viewport-relative поведение при pagination приводит к повторению, перекрытию или иной ложной representation.

По умолчанию декоративный/навигационный fixed/sticky элемент должен получить одно meaningful static placement, а не механически дублироваться на каждом PDF page. Семантические repeating headers, например части таблиц, могут иметь отдельные deterministic rules.

## 12. Temporal state: animations, transitions, GIF, video

Статический PDF должен быть привязан к admitted temporal state, а не к случайному более позднему моменту `printToPDF`.

- CSS/WAAPI animation/transition: стремиться freeze sampled admitted phase, не reset в `0` и не продолжать до произвольного print moment;
- animated image/GIF: стремиться сохранить фактически показанный admitted frame; `img.complete`/resource readiness не является доказательством frame identity;
- video: PDF сохраняет текущий видимый admitted frame/time representation, но не обязан сохранять playback interaction;
- если exact visible temporal identity нельзя доказать, это должно отражаться в diagnostics/acceptance, а не скрываться за generic success.

## 13. Focus и selection

User focus/selection считается частью fidelity, когда materially меняет **non-hover** presentation или renderer-owned control state.

Нужно сохранять, где применимо:

- input/textarea value;
- checked/radio state;
- selected options;
- relevant internal control scroll position;
- visible user selection/control state;
- `:focus`/`:focus-within` presentation, если оно существенно для результата.

Focus, созданный самим WebClip после admission, не должен подменять source user focus. Literal blinking caret не обязан воспроизводиться как animation в PDF.

## 14. Hover исключён из текущего PDF contract

Hover-only state **не должен попадать в сохранённую PDF-копию, даже если hover был открыт самим пользователем в момент admission**.

Это включает hover-only:

- menus;
- tooltips;
- overlays;
- flyouts;
- pseudo/state styling, существующее только из-за pointer hover.

PDF должен стремиться к соответствующему non-hover presentation, не синтезируя новый hover. Если отделить hover-only effect от другого admitted state без потери достоверности технически невозможно, это должно быть явной degraded/unknown границей.

Hover exclusion имеет приоритет над общим правилом сохранения transient visible state. Будущий формат/режим может принять другое решение только отдельным explicit product contract.

## 15. Dialog / popover / top layer

Non-hover dialog/popover/top-layer state сохраняется согласно admission:

- если он был открыт на admission, его следует представить открытым один раз настолько faithfully, насколько позволяет статический PDF;
- если он был закрыт, WebClip не открывает его ради completeness;
- hover-only top-layer/flyout исключается по §14.

Backdrops, geometry и перекрытие учитываются настолько, насколько они materially меняют вид выбранного content.

## 16. Forms и renderer-owned controls

PDF отражает текущий renderer state, а не только исходные HTML attributes.

Например, если DOM attribute содержит старый `value`, а пользователь уже ввёл новое значение, PDF должен показывать новое значение. Аналогично для textarea, checkbox/radio, select и других representable controls.

PDF не выполняет submit/action и не сохраняет активное page script behavior только ради воспроизведения формы.

## 17. Images, SVG, canvas и replaced media

Fidelity относится к фактически admitted representation, а не только к совпадению URL.

Где применимо, необходимо учитывать:

- responsive image candidate/currentSrc;
- decoded resource generation;
- intrinsic dimensions;
- object-fit/object-position/crop;
- SVG resolved resources/state;
- canvas bitmap/render state;
- video visible frame;
- geometry/layout context.

Одинаковый URL не является доказательством одинаковых bytes/generation/pixels.

## 18. iframe и Shadow DOM

Если iframe/Shadow/composed content находится внутри selected scope, его пользовательски видимое содержимое является частью PDF contract.

- same-origin frame должен быть связан с exact frame generation и сохраняться без подмены context;
- Shadow DOM/slots должны оцениваться по composed/rendered representation, а не только light-DOM markup;
- недоступная cross-origin граница должна быть truthfully represented настолько, насколько это безопасно и технически возможно;
- невозможность получить существенное содержимое не должна превращаться в silent blank/full-success.

## 19. Transformation classes текущего PDF-режима

Для deep research и implementation используются четыре класса:

1. **Representation-only** — pagination, scaling и другие format-level изменения без смены semantics: разрешены.
2. **Static flattening** — ordinary/nested scroll expansion, controlled fixed/sticky flattening, inert control representation: разрешены при сохранении ordering/fidelity.
3. **Bounded materialization inside accepted scope** — safe disclosure expansion, lazy resources уже существующего content, finite reconstruction в пределах user-reached dynamic boundary: разрешены с budgets/provenance/diagnostics.
4. **Semantic expansion/transformation** — Reader extraction, auto-scroll для получения ещё не user-reached logical items, `Load more`, navigation, submit, arbitrary hidden/modal/menu opening, crawler-like expansion: запрещены в текущем PDF contract без отдельного explicit product mode.

## 20. Physical artifact и truthful success

Техническое завершение capture/DOM preparation/`printToPDF` не является достаточным доказательством success.

Deep research и acceptance должны, где свойство observable только после rendering, проверять physical PDF bytes/raster/text/links/page count и другие relevant artifact properties.

Если preview/preparation выглядели корректно, но persisted/local/Yandex artifact содержит другое или неполное содержание, операция не соответствует этому contract.

## 21. Связь с будущими режимами

Текущий PDF contract сознательно объединяет faithful state и bounded static completeness. Это не означает, что WebClip навсегда должен иметь только один mode.

Отдельными будущими product decisions могут быть:

- pure current-state snapshot;
- более агрессивный complete-static/archive mode;
- Reader/simplified mode;
- self-contained HTML/архивный формат;
- multi-representation save.

Каждый из них должен иметь собственную semantics и не должен скрыто менять contract текущего PDF.

## 22. Deep-research rule

При глубоком исследовании PDF каждый relevant surface должен проверяться относительно этого contract, а не относительно неопределённого критерия «похоже на страницу».

Особое внимание обязательно уделяется границам:

- user-selected scope / Exclude;
- admission generation;
- ordinary scroll completeness;
- user-reached dynamic-scroll boundary;
- disclosure expansion;
- hover exclusion;
- focus/temporal state;
- responsive/resource identity;
- virtualized content history;
- frame/shadow/control state;
- pagination/static flattening;
- physical artifact identity;
- truthful degraded/partial/unknown receipts.

External user-intent/peer-product research по `RESEARCH_EXTERNAL_USER_INTENT_RESEARCH_POLICY.md` остаётся обязательным входом deep research и product discovery, но изменить этот fidelity contract оно может только через отдельное явное product decision пользователя, durably зафиксированное в project policy.
