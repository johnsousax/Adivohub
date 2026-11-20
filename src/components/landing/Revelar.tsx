"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

type Marca = "div" | "li" | "p" | "h2" | "h3" | "section";
type Efeito = "subir" | "escala" | "foco";

/** Um observador só para a página inteira, criado no primeiro uso. */
let observador: IntersectionObserver | null = null;

function obterObservador(): IntersectionObserver {
  observador ??= new IntersectionObserver(
    (entradas) => {
      for (const entrada of entradas) {
        if (!entrada.isIntersecting) continue;
        (entrada.target as HTMLElement).dataset.revelar = "visivel";
        observador?.unobserve(entrada.target);
      }
    },
    // Dispara um pouco antes de o elemento encostar na borda de baixo da tela.
    { rootMargin: "0px 0px -10% 0px", threshold: 0.06 },
  );
  return observador;
}

/**
 * Faz o conteúdo surgir quando entra na tela ao rolar.
 *
 * O HTML que chega do servidor é o conteúdo completo e visível. Só depois que o
 * JavaScript carrega é que o componente esconde o que está abaixo da tela, para
 * revelar na rolagem. Assim nada some se o JavaScript falhar, e o que já está à
 * vista não pisca. Quem pede menos movimento no sistema vê tudo parado.
 */
export function Revelar({
  como = "div",
  efeito = "subir",
  atraso = 0,
  className,
  children,
}: {
  como?: Marca;
  efeito?: Efeito;
  /** Atraso em milissegundos, para itens vizinhos entrarem em sequência. */
  atraso?: number;
  className?: string;
  children: ReactNode;
}) {
  const referencia = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const elemento = referencia.current;
    if (!elemento || !("IntersectionObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Já está à vista quando a página carrega: fica como está.
    if (elemento.getBoundingClientRect().top < window.innerHeight * 0.92) return;

    elemento.dataset.revelar = "oculto";
    const observadorDaPagina = obterObservador();
    observadorDaPagina.observe(elemento);
    return () => observadorDaPagina.unobserve(elemento);
  }, []);

  // Todas as marcas aceitas recebem as mesmas propriedades; o tipo "div" serve a todas.
  const Elemento = como as "div";
  return (
    <Elemento
      ref={referencia}
      className={className}
      data-efeito={efeito === "subir" ? undefined : efeito}
      style={atraso ? ({ "--atraso": `${atraso}ms` } as CSSProperties) : undefined}
    >
      {children}
    </Elemento>
  );
}
