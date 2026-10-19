# New Hampshire EFA (nh-efa): notes for later

Recorded 2026-10-18 from the owner's source checks. Draft rules are in `data/rules/nh-efa.yaml` (2026-10-19).

- "Computer device" means a laptop or desktop; one every three years (Ed 800).
- A built computer is capped at $1,600 per component and $3,600 total. Sources: CSF NH form STU-18 and policy STU-05, both August 2026.
- The November 2025 handbook said $3,500. Cite only the 2026 documents.
- iPads are not computer devices.
- The purchase-price cap for a ready-made (not built) computer is not confirmed.
- Income rules need re-verifying on an official, current page before they are used anywhere.

## Held: items that only CSF NH documents cover (2026-10-19)

Every rule must cite a tier 1-3 source. RSA 194-F:2, II(o) lets the scholarship organization approve
other expenses, but CSF NH is the administrator (tier 4), so these wait for a decision on how to treat it.
From the Parent Handbook (updated August 2026):

- Athletic equipment: $500 per item (p. 21); large or multi-user equipment such as goals and nets not allowed (p. 28).
- Backpacks: allowed as school supplies (p. 21). Water bottles: not allowed (p. 27).
- Museum and educational venue admission: individual admission allowed with an order comment on how it supports the student (pp. 18-19); amusement parks, class trips and travel not allowed.
- Music lessons and sports lessons or team programs: allowed from EFA-approved providers (p. 24).
- Not allowed: cell phones, plans and accessories; smartwatches; TVs; game consoles and accessories; furniture (desks, chairs, shelves); toys (action figures, dolls, Lego, RC vehicles); food, drinks, lunch fees; clothing that is not a required uniform (pp. 26-28). The list "is NOT exhaustive".
- Family or group memberships: not allowed; individual memberships must be itemized (p. 27).
- Streaming services and live entertainment tickets: not allowed (p. 28).

<details><summary>Draft YAML for these rules (ready to add if CSF NH is treated as tier 2 or 3)</summary>

```yaml
  # The rules below rest only on the CSF Parent Handbook (tier 4), so they show "not verified".
  - category: sports.equipment
    status: conditional
    source: csf-parent-handbook
    conditions:
      max_amount: 500
    locator: "Parent Handbook p. 21; p. 28"
    quote: null
    conditions_text:
      en: "Athletic equipment is capped at $500 per item. Large or multi-user equipment such as goals and nets is not allowed."
      es: "El equipo deportivo tiene un límite de $500 por artículo. No se permite el equipo grande o de uso múltiple, como porterías y redes."

  - category: bags.backpack
    status: allowed
    source: csf-parent-handbook
    locator: "Parent Handbook p. 21, school supplies"
    quote: null
    conditions_text:
      en: "Backpacks are listed as school supplies. Water bottles are not allowed (p. 27)."
      es: "Las mochilas aparecen como útiles escolares. Las botellas de agua no se permiten (p. 27)."

  - category: edu.field_trip
    status: conditional
    source: csf-parent-handbook
    locator: "Parent Handbook pp. 18-19"
    quote: null
    conditions_text:
      en: "Individual admission to an educational venue such as a science, history or art museum is allowed if you explain in the order comments how it supports the student's education. Amusement parks, class trips and travel are not."
      es: "Se permite la entrada individual a un lugar educativo, como un museo de ciencias, historia o arte, si explica en los comentarios del pedido cómo apoya la educación del estudiante. Los parques de diversiones, los viajes escolares y los viajes no."

  - category: edu.lessons.music
    status: conditional
    source: csf-parent-handbook
    locator: "Parent Handbook p. 24"
    quote: null
    conditions_text:
      en: "Music lessons are allowed from an EFA-approved provider."
      es: "Las clases de música se permiten con un proveedor aprobado por EFA."

  - category: edu.lessons.sports
    status: conditional
    source: csf-parent-handbook
    locator: "Parent Handbook p. 24"
    quote: null
    conditions_text:
      en: "Sports lessons and team programs, such as soccer, tennis and swimming, are allowed from an EFA-approved provider."
      es: "Las clases de deporte y los programas de equipo, como fútbol, tenis y natación, se permiten con un proveedor aprobado por EFA."

  - category: tech.phone
    status: not_allowed
    source: csf-parent-handbook
    locator: "Parent Handbook p. 27, non-allowable expenses"
    quote: null
    conditions_text:
      en: "Cell phones, phone plans and phone accessories are not allowed."
      es: "Los teléfonos celulares, los planes y los accesorios de teléfono no se permiten."

  - category: tech.smartwatch
    status: not_allowed
    source: csf-parent-handbook
    locator: "Parent Handbook p. 27, non-allowable expenses"
    quote: null
    conditions_text:
      en: "Smartwatches are not allowed."
      es: "Los relojes inteligentes no se permiten."

  - category: tech.tv
    status: not_allowed
    source: csf-parent-handbook
    locator: "Parent Handbook p. 27, household electronics"
    quote: null
    conditions_text:
      en: "Televisions are not allowed."
      es: "Los televisores no se permiten."

  - category: tech.game_console
    status: not_allowed
    source: csf-parent-handbook
    locator: "Parent Handbook p. 27, household electronics"
    quote: null
    conditions_text:
      en: "Video game consoles and game accessories are not allowed."
      es: "Las consolas de videojuegos y sus accesorios no se permiten."

  - category: furniture.desk
    status: not_allowed
    source: csf-parent-handbook
    locator: "Parent Handbook p. 27, furniture"
    quote: null
    conditions_text:
      en: "Furniture, including desks, chairs and shelves, is not allowed."
      es: "Los muebles, incluidos escritorios, sillas y repisas, no se permiten."

  - category: toys.general
    status: not_allowed
    source: csf-parent-handbook
    locator: "Parent Handbook p. 28, toys"
    quote: null
    conditions_text:
      en: "Toys such as action figures, dolls, Lego and remote-control vehicles are not allowed."
      es: "Los juguetes como figuras de acción, muñecas, Lego y vehículos a control remoto no se permiten."

  - category: food.general
    status: not_allowed
    source: csf-parent-handbook
    locator: "Parent Handbook p. 27, food"
    quote: null
    conditions_text:
      en: "Food, snacks, drinks and lunch fees are not allowed."
      es: "La comida, las meriendas, las bebidas y las cuotas de almuerzo no se permiten."

  - category: clothing.general
    status: not_allowed
    source: csf-parent-handbook
    locator: "Parent Handbook p. 26, clothing"
    quote: null
    conditions_text:
      en: "Clothing that is not a required school uniform, including winter gear, workout clothes and shoes, is not allowed."
      es: "La ropa que no sea un uniforme escolar obligatorio, incluida la ropa de invierno, deportiva y el calzado, no se permite."
```
</details>
