import { component$, useStylesScoped$ } from "@builder.io/qwik";

export const JSChunk = component$(() => {
  useStylesScoped$(
    `
          div {
            width: 30px;
            height: 30px;
            color: var(--off-black);
            background: #F1DC4E;
            font-family: system-ui, sans-serif;
            font-weight: 700;
            display: flex;
            align-items: end;
            justify-content: end;
            padding-right: 3px;
          }

          span {
            display: block;
          }
           
        `
  );

  return (
    <div>
      <span>JS</span>
    </div>
  );
});
