import { component$, Slot, useStyles$, useSignal, $ } from "@builder.io/qwik";
import styles from "./mouse-overlay.css?inline";

export const MouseOverlay = component$(() => {
    useStyles$(styles);
    const xPos = useSignal(10);
    const yPos = useSignal(50);
    const overlayRef = useSignal<HTMLDivElement>();
    const rectRef = useSignal<DOMRect>();

    const onPointerEnter$ = $(() => {
        if (!overlayRef.value) return;
        rectRef.value = overlayRef.value.getBoundingClientRect();
    });

    const onPointerMove$ = $((e: PointerEvent) => {
        if (!rectRef.value) return;
        xPos.value = ((e.clientX - rectRef.value.left) / rectRef.value.width) * 100;
        yPos.value = ((e.clientY - rectRef.value.top) / rectRef.value.height) * 100;

        if (!overlayRef.value) return;

        overlayRef.value.style.setProperty("--x-pos", `${xPos.value}%`);
        overlayRef.value.style.setProperty("--y-pos", `${yPos.value}%`);
    });

    const onPointerLeave$ = $(() => {
        console.log("leave");
        if (!overlayRef.value) return;

        xPos.value = 10;
        yPos.value = 50;
        overlayRef.value.style.setProperty("--x-pos", `${xPos.value}%`);
        overlayRef.value.style.setProperty("--y-pos", `${yPos.value}%`);
    });
    
    return (
        <div class="overlay-container">
            <Slot />
            <div 
                ref={overlayRef}
                class="overlay" 
                onPointerEnter$={onPointerEnter$}
                onPointerMove$={onPointerMove$}
                onPointerLeave$={onPointerLeave$}
                style={{
                    background: `radial-gradient(
                        circle 150px at var(--x-pos) var(--y-pos),
                        transparent 0%,
                        transparent 30%,
                        var(--off-black) 70%
                    )`
                }}
            />
        </div>
    )
});