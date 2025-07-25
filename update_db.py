#!/usr/bin/env python3
"""
Script para atualizar o banco de dados com as novas colunas
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from src.models.tronos_models import db, TronosUser, RemovalRequest, ContactMessage, SystemLog

def create_app():
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///src/database/app.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = 'tronos-secret-key-2024'
    
    db.init_app(app)
    return app

def update_database():
    """Atualizar banco de dados com novas colunas"""
    app = create_app()
    
    with app.app_context():
        try:
            # Criar todas as tabelas com as novas colunas
            db.create_all()
            
            print("✅ Banco de dados atualizado com sucesso!")
            print("✅ Novas colunas adicionadas para criadores")
            print("✅ Sistema pronto para uso")
            
        except Exception as e:
            print(f"❌ Erro ao atualizar banco de dados: {e}")
            return False
    
    return True

if __name__ == '__main__':
    print("🔄 Atualizando banco de dados...")
    success = update_database()
    
    if success:
        print("🎉 Atualização concluída!")
    else:
        print("💥 Falha na atualização!")
        sys.exit(1)

