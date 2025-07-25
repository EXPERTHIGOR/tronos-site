#!/usr/bin/env python3
"""
Script para testar o cadastro de agentes via API
"""

import requests
import json

# URL da aplicação hospedada
BASE_URL = "https://kkh7ikclx1n7.manus.space"

def test_agent_registration():
    """Testa o cadastro de um agente"""
    
    # Dados do agente de teste
    agent_data = {
        "login": "agente_teste_api",
        "password": "senha123",
        "full_name": "João Silva Teste",
        "channel_name": "Canal Teste",
        "email": "agente.teste@email.com",
        "birth_date": "1990-01-01",
        "whatsapp": "+5511999999999",
        "user_type": "agent",
        "function": "Editor principal",
        "function_other": None,
        "represented_creator": "Criador Teste",
        "registration_code": "TESTE123"
    }
    
    try:
        print("🔄 Testando cadastro de agente...")
        print(f"📡 URL: {BASE_URL}/register")
        print(f"📋 Dados: {json.dumps(agent_data, indent=2)}")
        
        # Fazer requisição POST para cadastro
        response = requests.post(
            f"{BASE_URL}/register",
            json=agent_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"📊 Status Code: {response.status_code}")
        print(f"📄 Response: {response.text}")
        
        if response.status_code == 201:
            print("✅ Cadastro realizado com sucesso!")
            return True
        else:
            print("❌ Erro no cadastro!")
            return False
            
    except Exception as e:
        print(f"💥 Erro na requisição: {str(e)}")
        return False

def test_pending_users():
    """Testa a listagem de usuários pendentes"""
    
    try:
        print("\n🔄 Testando listagem de usuários pendentes...")
        print(f"📡 URL: {BASE_URL}/admin/pending-users")
        
        # Fazer requisição GET para listar usuários pendentes
        response = requests.get(f"{BASE_URL}/admin/pending-users")
        
        print(f"📊 Status Code: {response.status_code}")
        print(f"📄 Response: {response.text}")
        
        if response.status_code == 200:
            users = response.json()
            print(f"✅ Encontrados {len(users)} usuários pendentes")
            
            for user in users:
                print(f"  👤 {user.get('login')} - {user.get('user_type')} - {user.get('full_name')}")
            
            return True
        else:
            print("❌ Erro ao listar usuários pendentes!")
            return False
            
    except Exception as e:
        print(f"💥 Erro na requisição: {str(e)}")
        return False

if __name__ == "__main__":
    print("🚀 Iniciando testes de cadastro de agentes\n")
    
    # Testar cadastro
    registration_success = test_agent_registration()
    
    # Testar listagem
    listing_success = test_pending_users()
    
    print(f"\n📋 RESUMO DOS TESTES:")
    print(f"  📝 Cadastro: {'✅ OK' if registration_success else '❌ FALHOU'}")
    print(f"  📋 Listagem: {'✅ OK' if listing_success else '❌ FALHOU'}")
    
    if registration_success and listing_success:
        print("\n🎉 Todos os testes passaram!")
    else:
        print("\n⚠️  Alguns testes falharam - verificar logs acima")

