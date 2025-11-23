
//import "./Barrabusqueda.css";
import { Search } from "lucide-react";
import React from "react";
import './Barrabusqueda.css';
export default function BarraBusqueda() {
return (
    <div className="search-container">
        <div className="title">
        <h1 className="a">Buscador de Mascotas</h1>
        </div>
        
    <div className="search-bar">
        <Search className="search-icon" />
        <input type="text" placeholder="Buscar..." className="search-input" />
    </div>
    </div>
);
}
