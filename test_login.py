#!/usr/bin/env python3
import os
import sys

# Adicionar o diretório src ao path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from src.main import app
from src.models.tronos_models import db, TronosUser

def test_login():
    with app.app_context():
        print("🔍 Testando conexão com banco e login...")
        
        # Verificar se o admin existe
        admin = TronosUser.query.filter_by(email='admin@tronos.com').first()
        if not admin:
            print("❌ Admin não encontrado no banco!")
            return
        
        print(f"✅ Admin encontrado: {admin.email}")
        print(f"📧 Email: {admin.email}")
        print(f"👤 Nome: {admin.full_name}")
        print(f"🔑 Login: {admin.login}")
        print(f"✅ Aprovado: {admin.is_approved}")
        print(f"🏷️ Tipo: {admin.user_type}")
        
        # Testar senha
        password_test = admin.check_password('admin123')
        print(f"🔐 Teste de senha 'admin123': {'✅ OK' if password_test else '❌ FALHOU'}")
        
        # Listar todos os usuários
        all_users = TronosUser.query.all()
        print(f"\n📊 Total de usuários no banco: {len(all_users)}")
        for user in all_users:
            print(f"  - {user.email} ({user.user_type}) - Aprovado: {user.is_approved}")

if __name__ == '__main__':
    test_login()

