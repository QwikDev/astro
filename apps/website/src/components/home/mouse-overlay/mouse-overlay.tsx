import { component$, Slot, useStyles$, useSignal, $ } from "@builder.io/qwik";
import styles from "./mouse-overlay.css?inline";

export const MouseOverlay = component$(() => {
    useStyles$(styles);
    const xPos = useSignal(10);
    const yPos = useSignal(50);
    const overlayRef = useSignal<Element>();
    const rectRef = useSignal<DOMRect>();

    const onPointerEnter$ = $(() => {
        if (!overlayRef.value) return;
        rectRef.value = overlayRef.value.getBoundingClientRect();
    });

    const onPointerMove$ = $((e: PointerEvent) => {
        if (!rectRef.value) return;
        xPos.value = ((e.clientX - rectRef.value.left) / rectRef.value.width) * 100;
        yPos.value = ((e.clientY - rectRef.value.top) / rectRef.value.height) * 100;
    });

    const onPointerLeave$ = $(() => {
        const startX = xPos.value;
        const startY = yPos.value;
        const endX = 10;
        const endY = 50;
        const duration = 300;
        const startTime = performance.now();

        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            xPos.value = startX + (endX - startX) * progress;
            yPos.value = startY + (endY - startY) * progress;

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
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
                        circle 150px at ${xPos.value}% ${yPos.value}%,
                        transparent 0%,
                        transparent 30%,
                        var(--off-black) 70%
                    )`
                }}
            />
        </div>
    )
});