"use client";
import Image from "next/image";
import Link from "next/link";
import { useApp } from "@/lib/context";
export default function Hero() {
    const { t, lang } = useApp();
    return <section className="hero" id="home" aria-label="Welcome">
 <div className="hero-inner"><span className="eyebrow">HOTEL GANGA IMPERIAL</span><h1>{lang === "hi" ? "ठहरिए। सुकून से।" : <>A little grandeur.<br /><em>A warmer welcome.</em></>}</h1><p>{t("hero.subtitle")}</p><div className="btns"><Link className="btn btn-solid" href="/book">{t("hero.book")} <span aria-hidden="true">↗</span></Link><a className="btn btn-ghost" href="#rooms">{t("hero.rooms")}</a></div><div className="hero-details"><span>STAY</span><span>UNWIND</span><span>CELEBRATE</span></div></div>
 <div className="hero-media"><Image src="/images/image-43.jpeg" alt="Warmly illuminated Hotel Ganga Imperial exterior at night" fill sizes="(max-width:900px) 100vw, 55vw" preload/><span className="hero-caption">YOUR STAY BEGINS HERE</span></div></section>;
}
